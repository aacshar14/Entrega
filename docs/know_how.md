# Know How - EntréGA App

Este documento recopila guías y formatos estándar para el uso de la aplicación por parte de los tenants y operadores.

## Importación de Clientes (CSV)

El formato recomendado para realizar la carga masiva de clientes en la plataforma es un archivo CSV con el siguiente esquema:

**Encabezados:**
`name,phone,email,initial_balance,notes`

**Ejemplo de datos:**
```csv
name,phone,email,initial_balance,notes
Ana,+528781111111,ana@email.com,650,Cliente frecuente
Luis,+528782222222,,300,
Martha,+528783333333,martha@email.com,0,Paga semanal
```

### Consideraciones técnicas:
1. **name**: El nombre completo o identificador del cliente. (Obligatorio)
2. **phone**: Teléfono a 10-12 dígitos incluyendo código de país (Ej: +52 para México). (Obligatorio para notificaciones WhatsApp)
3. **email**: Opcional. Se puede dejar en blanco si no se cuenta con él.
4. **initial_balance**: Saldo inicial que el cliente debe a la fecha de carga. (Default: 0)
5. **notes**: Notas adicionales o referencias del cliente.
