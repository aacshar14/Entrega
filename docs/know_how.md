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

### Consideraciones técnicas

1. **name**: El nombre completo o identificador del cliente. (Obligatorio)
2. **phone**: Teléfono a 10-12 dígitos incluyendo código de país (Ej: +52 para México). (Obligatorio para notificaciones WhatsApp)
3. **email**: Opcional. Se puede dejar en blanco si no se cuenta con él.
4. **initial_balance**: Saldo inicial que el cliente debe a la fecha de carga. (Default: 0)
5. **notes**: Notas adicionales o referencias del cliente.

## Importación de Stock y Productos (CSV)

Para cargar tu inventario inicial y catálogo de productos, utiliza el siguiente formato CSV:

**Encabezados:**
`name,sku,price,initial_stock,category`

**Ejemplo de datos:**

```csv
name,sku,price,initial_stock,category
Chocolate Amargo 70%,CH-AM-001,150.0,100,Chocolates
Chocolate con Leche,CH-LE-002,120.0,50,Chocolates
Caja de Regalo Grande,ACC-001,45.0,20,Accesorios
```

### Consideraciones técnicas adicionales

1. **name**: Nombre comercial del producto. (Obligatorio)
2. **sku**: Identificador único o código de barras del producto. (Opcional, pero recomendado)
3. **price**: Precio de venta al público en formato decimal. (Default: 0.0)
4. **initial_stock**: Cantidad física disponible al momento de la carga. (Genera un saldo de stock automático)
5. **category**: Etiqueta para agrupar productos en el catálogo. (Opcional)
