# 🚀 EntréGA V1.1: Multi-Tenant Intelligence

Sistema integral de gestión logística e inventarios en tiempo real para negocios de última milla. Optimizado para el piloto **ChocoBites México**.

## 🏗️ Arquitectura de Producción

EntréGA ha evolucionado a una arquitectura **Enterprise Multi-Tenant**, permitiendo que múltiples negocios operen en una infraestructura única con total aislamiento de datos.

### 📁 Estructura del Monorepo

- **`apps/api/`**: Backend en FastAPI + SQLModel (api.entrega.space). Motor de inteligencia y webhooks.
- **`apps/web/`**: Panel de Control en Next.js (app.entrega.space). UX Premium enfocada en rapidez operativa.
- **`infra/`**: Configuración de despliegue Cloud Run y scripts de automatización.

---

## 🔥 Key Features

### 🎓 EntréGA Academy (Onboarding)

Flujo de activación de 4 pasos para nuevos negocios:

1. **Identidad**: Configuración de marca y regionalización.
2. **Clientes**: Carga masiva de rutas y contactos vía CSV.
3. **Inventario**: Sincronización inicial de stock y catálogos.
4. **WhatsApp**: Conexión con Meta Cloud API para notificaciones automáticas.

### 🧠 Intelligence Mode (AI Learning)

Parsing Engine v1 que aprende del lenguaje real del negocio:

- **Admin Review**: Panel para corregir y validar mensajes de repartidores.
- **Tenant Dictionary**: Aliases locales (Ej: "Juan" → "Juan Lopez") para matching instantáneo.
- **Zero-Guessing**: El sistema prioriza el aprendizaje sobre la automatización agresiva.

### 🏛️ Multi-Tenant Core

- **Aislamiento Total**: Seguridad nativa para manejar ChocoBites, Chiltepik y otros sin cruce de datos.
- **RBAC**: Roles de Dueño y Operador preconfigurados.
- **Timezone/Currency**: Soporte regional independiente por negocio.

---

## 🚀 Despliegue Local (Docker)

Levanta todo el stack con un solo comando:

```bash
docker-compose up --build
```

- **Web App:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000`
- **API Docs:** `http://localhost:8000/docs`

---

## 🔐 Stack Tecnológico

- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons.
- **Backend**: FastAPI, SQLModel (Pydantic + SQLAlchemy).
- **Database**: PostgreSQL (Supabase Managed).
- **Auth**: Supabase JWT + Middleware de Tenancy.
- **CI/CD**: GitHub Actions → Google Cloud Run.

---
© 2026 EntréGA Project - `entrega.space`
