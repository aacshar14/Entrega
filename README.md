# EntréGA V1.1 - Monorepo

Sistema integral de gestión logística (ChocoBites Pilot) con Backend en FastAPI y Frontend en Next.js.

## 📁 Estructura
```text
EntreGA/
├── apps/
│   ├── api/            # Backend FastAPI y Webhooks (api.entrega.space)
│   └── web/            # Panel de Administración Next.js (app.entrega.space)
├── infra/              # Configuración de despliegue y scripts
└── docs/               # Documentación técnica y de producto
```

## 🚀 Despliegue Local (Docker)
Levanta todo el stack (DB, API, Web) con un solo comando:
```bash
docker-compose up --build
```
- **Web App:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000`
- **API Docs:** `http://localhost:8000/docs`

## ⚙️ Configuración
Los archivos `.env` se encuentran dentro de cada aplicación en `apps/`.
1. `apps/api/.env`: Configuración de base de datos y WhatsApp API.
2. `apps/web/.env`: Variables de entorno para Next.js.

## 🛠️ Desarrollo
Para desarrollo local fuera de Docker:
- **API:** `cd apps/api && uvicorn app.main:app --reload`
- **Web:** `cd apps/web && npm run dev`

## 🔐 Seguridad y CORS
Configurado para permitir comunicaciones cruzadas entre `app.entrega.space` y `api.entrega.space`.

---
© 2026 EntréGA Project - `entrega.space`
