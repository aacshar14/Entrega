# Postmortem Document: Incidente "Ceros" en Dashboard de Producción

**Fecha del Incidente:** 14 de Abril de 2026  
**Duración del Impacto Crítico:** Aprox. 24 horas (desde la migración estructural a Dashboard V7)  
**Entornos Afectados:** Producción (`api.entrega.space` / Cloud Run)  

---

## 1. Resumen Ejecutivo
Tras el despliegue del contrato consolidado **Dashboard V7**, el panel operativo principal de los usuarios comenzó a mostrar todas las métricas en cero (`0`) incluyendo Cartera, Flujo, Deudas y Estado de Stock. A nivel de infraestructura, los contenedores permanecían estables y no emitían reintentos de colapso severo (503), mientras el CI/CD (GitHub Actions) declaraba exitosos y en verde todos los lanzamientos a producción. Tras el rastreo quirúrgico, la causa descubierta fue transgeneracional: el ORM (SQLAlchemy) emitía una excepción interna al intentar mapear los strings minúsculos traídos desde PostgreSQL a la estructura de clases nativa estricta de Enums en Python 3.11.

## 2. Descripción de Arcos del Escenario

### A. El Error Silencioso del ORM 
El backend usaba `type: MovementType` dentro de SQLModel (herencia abstracta Pydantic/SQLAlchemy). Cuando SQLAlchemy recibía filas estandarizadas con strings minúsculas (ej. `"delivery"` o `"restock"`) extraídos de PostgreSQL, generaba la siguiente interrupción de procesamiento:
```python
LookupError: 'delivery' is not among the defined enum values. 
Enum name: movementtype. Possible values: DELIVERY, RESTOCK...
```
Esta desconexión imposibilitaba el cálculo final del `get_dashboard_summary()` de los tenantes.

### B. Evadiendo Cachar el Error Fuerte (200 OK enmascarado)
Una rutina robusta de try-catch dentro de `dashboard.py` detectaba la caída del cálculo e intentaba generar una traza sin tirar el contenedor, regresando el JSON:
```json
{
   "error": "DASHBOARD_INVENTORY_LOGIC_FAILURE",
   "message": "...",
   "traceback": "..."
}
```
Debido a que el diccionario se retornó en forma suelta (sin un Response HTTP estructurado al código HTTP_400), **FastAPI empaquetó este error como un ÉXITO en HTTP 200.**

### C. La Ilusión de Seguridad del CI/CD
Las pruebas de humo (Smoke Tests) dentro de nuestro pipeline validaban la salud operativa del backend disparando `curl -w "%{http_code}"` asumiendo que 200 validaba todo el contrato API. Por consiguiente, los commits de este contrato defectuoso evadieron el cerrojo del pipeline y sobreescribieron limpiamente la máquina de producción.

### D. El Anti-Crash Layer del Frontend actuó "demasiado bien"
El Dashboard React (`page.tsx`) fue diseñado bajo el principio defensivo de *no desplomarse*. Ante un payload sin llaves de atributos nativos de conteo como `.stats` y `.stock`, el código transmutó variables como `safeNumber(undefined)` en `0`. Visualmente todo operaba estable y no se colgaba la página, causando una "pantalla en Ceros", pero funcional.

---

## 3. Resolución Táctica y Reparación (Minimal Patch Aplicado)

Para estabilizar la plataforma en *Strict Mode* bajo los parámetros exigidos de Entrega, eludimos la reimplementación de transpiladores Enum complejos.

1. **Parche Funcional Estructural:** En `models.py` (Vena central de SQLModel), las variables nativas dictatorias de las tablas `InventoryMovement` y `WhatsAppMessage` se cambiaron en estricto bypass a strings estáticos, eliminando validaciones engorrosas a capa de DB de Python y delegándola a los Validadores nativos de Pydantic. 
   ```python
   type: str = Field(default="delivery", index=True)
   processing_status: str = Field(default="pending", index=True)
   ```
   **Resultado:** SQLAlchemy en Cloud Run dejó de colisionar, el backend generó correctamente los algoritmos, devolvió los totales nativos (eg. `$3378`) logrando que el Dashboard volviera a funcionar y mostrar la métrica correcta para la cartera de cada inquilino de la App en producción.

2. **Parches Visuales UI Simultáneos:** En beneficio del flujo de la entrega, se arregló una anomalía estructural donde los CSS estaban mal escalados en la UI y se eliminaron textos redundantes en subventanas.  

---

## 4. Lecciones y Planes de Rehardening (Acciones Siguientes)

### I. Mejorar la Validación del Humo (CI/CD)
El cURL básico de GitHub Actions que evalúa códigos de estado deberá mutar y usar descriptores profundos:
* Parsear el JSON arrojado usando `jq`.
* Condicionar el pase verde si, y solo si, la cadena de respuesta carece del token estricto de `.error` o `.traceback`.
  
### II. Estandarizar Modelos Base vs Tráfico DB 
Todo nuevo modelo SQLModel/Pydantic que implique iteración transaccional sobre estados (`Enums`), requerirá forzosamente que el `sa_column` tipifique el puente de la lectura como `str` para evadir colisiones y *overhead* computacional innecesario si la DB maneja llaves minúsculas. 

### III. Contratos Duros en Frontend
Fortalecer notificaciones visuales (`Toast` o `Alertas UI`) en Frontend si se detecta que las métricas globales resultan misteriosamente asertivas en Cero, alertando explícitamente a SREs o Admins si el Backend escupió su "Safety Net Error" (`{"error":...}`).
