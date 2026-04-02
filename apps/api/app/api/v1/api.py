from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    webhooks,
    products,
    customers,
    stock,
    payments,
    balances,
    reports,
    users,
    dashboard,
    movements,
    tenants,
    learning,
    whatsapp_auth
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["system"])
api_router.include_router(whatsapp_auth.router, prefix="/whatsapp/auth", tags=["whatsapp-auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(movements.router, prefix="/movements", tags=["movements"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(stock.router, prefix="/stock", tags=["stock"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(balances.router, prefix="/balances", tags=["balances"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(users.router, prefix="/me", tags=["me"])
api_router.include_router(learning.router, prefix="/learning", tags=["learning"])
 # Added /me as a shortcut too, although users.py has it too
