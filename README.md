![Entrega Banner](docs/assets/banner.png)

<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-react/lucide/main/icons/zap.svg" width="48" height="48" />
  <h1><b>Entrega</b></h1>
  <p><i>Tu operación de entrega en piloto automático.</i></p>
  
  <p>
    <img src="https://img.shields.io/badge/v1.1-Pilot_Launch-56CCF2?style=for-the-badge&logo=rocket" />
    <img src="https://img.shields.io/badge/Platform-Admin_Ready-1D3146?style=for-the-badge&logo=shield" />
  </p>
</div>

---

## ⚡ El Concepto
**Entrega** es una plataforma logística de nueva generación diseñada para profesionalizar pequeñas flotas y negocios en crecimiento. Nacida del caos de los grupos de WhatsApp y las hojas de cálculo, Entrega centraliza pedidos, clientes y stock en una experiencia **mobile-first** de alto nivel.

## 🛠️ Tech Stack Universo Entrega

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | `Next.js 14` (App Router), `TailwindCSS`, `Lucide Icons`, `Framer Motion` |
| **Backend** | `FastAPI` (Python), `SQLModel`, `Uvicorn`, `Pydantic v2` |
| **Persistencia** | `PostgreSQL` via `Supabase`, `Migrations` via `Alembic` |
| **Seguridad** | `Supabase Auth` (Filtro ES256 via JWKS), `RBAC` Multi-Capas |
| **Integración** | `WhatsApp Business Cloud API` (Meta) |

---

## 🏰 Arquitectura: Doble Superficie
Entrega opera bajo un modelo de **Split Arquitectónico** que separa la gestión de infraestructura de las operaciones del negocio.

```mermaid
graph TD
    User((Usuario))
    Auth[Supabase Auth / ES256]
    API[(FastAPI Backend)]
    DB[(Postgres DB)]
    
    User --> Auth
    Auth --> API
    API --> DB

    subgraph "Superficie 1: Platform Admin"
        AdminPanel[Global Overview]
        UserRegistry[Directorio de Identidades]
        SystemHealth[SRE & Infra Monitor]
    end

    subgraph "Superficie 2: Tenant Workspace"
        Dashboard[Operaciones ChocoBites]
        Inventory[Stock & Precios Tiers]
        CRM[Directorios de Clientes]
        WhatsApp[Logística Automatizada]
    end

    API --- AdminPanel
    API --- Dashboard
```

---

## 🏢 Multi-Tenant Wiki
Para entender cómo manejamos el aislamiento de datos, los roles de usuario (Hugo vs. Leo) y la inyección de contexto por negocio, consulta nuestra documentación especializada:

👉 **[Wiki de Tenants & Arquitectura](docs/TENANTS.md)**

---

## 🚀 Guía de Inicio Rápido (Devs)

### 1. Clonar y Configurar
```bash
git clone https://github.com/aacshar14/Entrega.git
cd Entrega
```

### 2. Backend (FastAPI)
```bash
cd apps/api
pip install -r requirements.txt
# Configura tu .env con DATABASE_URL y SUPABASE_KEYS
py -m uvicorn app.main:app --reload
```

### 3. Frontend (Next.js)
```bash
cd apps/web
npm install
npm run dev
```

---

<div align="center">
  <p><i>Crafted for ChocoBites & The New Logistics Generation</i></p>
  <img src="https://img.shields.io/badge/Designed_by-Hugo-1D3146?style=flat-square" />
</div>
