# 🏢 Entrega Tenant Wiki

## Multi-Tenant Architecture (V1.1)

Entrega follows an **Isolated Workspace** model where data is strictly partitioned by `tenant_id`. Every analytical, financial, and inventory record is scoped to its specific business identity.

### 👥 Global Accounts vs. Tenant Memberships
Users in Entrega have two distinct identity layers:
1.  **Platform Identity**: Your global profile (email, name, platform_role).
2.  **Tenant Memberships**: Your specific role within a business (owner, operator).

### 🛠️ Role Definitions
| Role | Level | Permisos |
| :--- | :--- | :--- |
| **Platform Admin** | Plataforma | Control global, suspensión de cuentas, SRE, Métricas agregadas. |
| **Tenant Owner** | Negocio | Control total del Workspace ChocoBites, importación de stock, configuración de WhatsApp. |
| **Operator** | Negocio | Gestión diaria, ventas, entregas y pagos. Sin acceso a ajustes críticos. |

### 🧭 Tenant Entry Flow (The "Split")
When a **Platform Admin** enters the system:
1.  Land on `/platform` (Global HQ).
2.  Select a specific tenant from the registry.
3.  Inject the context and enter the Workspace (The URL switches to `/dashboard`).
4.  Optionally "Return to Platform" via the sidebar to resume global oversight.

### 🛡️ Security & Isolation
Isolation is enforced at two levels:
*   **Database (API)**: All queries are gated by the `get_active_tenant_id` dependency.
*   **UI (Frontend)**: The `TenantProvider` ensures that views only render data for the currently active context.

### 📊 Onboarding Checklist
Every new tenant must complete a 3-step sequence to go live:
1.  **Directorio de Clientes**: Import or create initial customers.
2.  **Catálogo de Productos**: Define SKUs and price tiers (Mayoreo, Menudeo, Especial).
3.  **WhatsApp Business**: Securely link the Meta API for automated logistics.
