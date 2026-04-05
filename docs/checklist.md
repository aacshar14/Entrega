# 🚀 Entrega V1.1 - Lanzamiento Pilot (ChocoBites)

Este checklist detalla los pasos críticos para movernos del desarrollo local (Docker) a la infraestructura real de producción.

## 🛠️ Infraestructura (API Keys & Config)

Ya he preparado el sistema para recibir estas variables. Por favor, tenlas listas para el despliegue:

### 📡 Meta WhatsApp Cloud API

- [ ] `WHATSAPP_VERIFY_TOKEN`: Token de verificación para el Webhook (lo definimos nosotros).
- [ ] `WHATSAPP_PHONE_NUMBER_ID`: Identificador del número de ChocoBites.
- [ ] `WHATSAPP_ACCESS_TOKEN`: Token de sistema permanente (System User Access Token).
- [ ] `WHATSAPP_WABA_ID`: WhatsApp Business Account ID.

### 💾 Supabase (Postgres & Auth)

- [ ] `SUPABASE_PROJECT_URL`: URL del proyecto (ej: `https://xxxx.supabase.co`).
- [ ] `SUPABASE_ANON_KEY`: Llave pública para el frontend.
- [ ] `DATABASE_URL`: String de conexión directa para el backend (Alembic/SQLModel).

### ☁️ Google Cloud Platform (GCP)

- [ ] `GCP_PROJECT_ID`: ID del proyecto dedicado para EntreGA.
- [ ] `GCP_REGION`: Región sugerida (us-central1).

---

## 🏗️ Tareas Técnicas Backend (V1.1)

- [x] Estructura Monorepo funcional.
- [x] Modelos Multi-tenant iniciales.
- [x] Endpoints base de dominio (Stock, Pagos, Clientes).
- [x] Lógica de Negocio en `parser_service.py` (Draft V1).
- [x] Sincronización de Esquema DB (Alembic Migrations).
- [ ] Registro de entrega -> Resta Stock y Suma Deuda (Enlazado al Webhook).
- [ ] Registro de pago -> Resta Deuda (Enlazado al Webhook).
- [ ] Generación de Reporte Semanal real (aggregates de SQL).

## 🎨 Tareas Frontend (Next.js)

- [x] Layout Base y Diseño Premium.
- [x] Dashboard de Pilotaje.
- [x] Conexión real con API (vía apiRequest).
- [x] Manejo de Estados y Auth (Supabase SSR Pattern).

## 🚀 Despliegue & Git

- [x] Limpieza de Repo GitHub (Reset a `main`).
- [ ] Configuración de GitHub Actions para CI/CD (Cloud Run).
- [ ] Configuración del dominio `entrega.space` (DNS).
