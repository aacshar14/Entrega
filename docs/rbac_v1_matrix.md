# Matriz de Permisos RBAC V1 - Entrega (ChocoBites)

Este documento detalla la implementación de Control de Acceso Basado en Roles (RBAC) para la versión 1 de Entrega, enfocada en el tenant piloto ChocoBites.

## Roles Definidos

| Rol | Descripción |
| :--- | :--- |
| **owner** | Administrador total del negocio. Tiene acceso a reportes, gestión de usuarios, productos y configuraciones críticas. |
| **operator** | Personal que realiza la operación diaria. No puede realizar ajustes manuales de stock ni modificar catálogos maestros (clientes, productos, etc.). |

## Permisos por Endpoint (Backend)

| Módulo | Endpoint | owner | operator | Auditoría |
| :--- | :--- | :---: | :---: | :---: |
| **Dashboard** | `GET /api/v1/dashboard` | ✅ | ✅ | - |
| **Stock** | `GET /api/v1/stock` | ✅ | ✅ | - |
| | `POST /api/v1/stock/adjustments` | ✅ | ❌ | ✅ |
| **Movimientos** | `GET /api/v1/movements` | ✅ | ✅ | - |
| | `POST /api/v1/movements/manual` | ✅ | ✅ | ✅ |
| | `PATCH /api/v1/movements/{id}` | ✅ | ❌ | ✅ |
| **Pagos** | `GET /api/v1/payments` | ✅ | ✅ | - |
| | `POST /api/v1/payments` | ✅ | ✅ | ✅ |
| | `PATCH /api/v1/payments/{id}` | ✅ | ❌ | ✅ |
| **Adeudos** | `GET /api/v1/balances` | ✅ | ✅ | - |
| **Clientes** | `GET /api/v1/customers` | ✅ | ✅ | - |
| | `POST /api/v1/customers` | ✅ | ❌ | ✅ |
| | `PATCH /api/v1/customers/{id}` | ✅ | ❌ | ✅ |
| **Productos** | `GET /api/v1/products` | ✅ | ✅ | - |
| | `POST /api/v1/products` | ✅ | ❌ | ✅ |
| | `PATCH /api/v1/products/{id}` | ✅ | ❌ | ✅ |
| **Reportes** | `GET /api/v1/reports/weekly` | ✅ | ❌ | - |
| **Usuarios** | `GET /api/v1/users` | ✅ | ❌ | - |
| | `GET /api/v1/users/me` | ✅ | ✅ | - |
| | `POST /api/v1/users` | ✅ | ❌ | - |
| | `PATCH /api/v1/users/{id}` | ✅ | ❌ | - |
| **Settings** | `GET /api/v1/settings` | ✅ | ❌ | - |
| | `PATCH /api/v1/settings` | ✅ | ❌ | ✅ |

## Visibilidad Frontend

| Menú | Ruta | owner | operator |
| :--- | :--- | :---: | :---: |
| **Dashboard** | `/dashboard` | Visible | Visible |
| **Stock** | `/stock` | Visible | Visible |
| **Movimientos** | `/movements` | Visible | Visible |
| **Pagos** | `/payments` | Visible | Visible |
| **Adeudos** | `/balances` | Visible | Visible |
| **Clientes** | `/customers` | Visible | Visible |
| **Productos** | `/products` | Visible | ❌ |
| **Reportes** | `/reports` | Visible | ❌ |
| **Usuarios** | `/users` | Visible | ❌ |
| **Configuración**| `/settings` | Visible | ❌ |

## Implementación Técnica

### Backend (FastAPI)
- Se utiliza la dependencia `require_roles(["owner", "operator"])` inyectada en los routers o funciones de endpoint individuales.
- El objeto `User` local extraído del JWT de Supabase contiene el campo `role`.
- Los campos de auditoría `created_by_user_id` y `updated_by_user_id` se llenan automáticamente en los modelos de base de datos durante las operaciones de escritura.

### Frontend (Next.js)
- El `Menu` se genera dinámicamente en `layout.tsx` filtrando los items mediante el rol presente en la sesión del usuario.
- El Header muestra dinámicamente el nombre del tenant, el nombre del usuario y su rol.
- Se ha actualizado la estética de los componentes de navegación para un look más premium y profesional.
