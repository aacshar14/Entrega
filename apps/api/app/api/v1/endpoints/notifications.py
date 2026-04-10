from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import List, Optional
from app.core.db import get_session
from app.models.models import Notification, User
from app.core.dependencies import get_current_user, get_optional_active_tenant_id
from app.services.notification_service import NotificationService
import uuid

router = APIRouter()


@router.get("/", response_model=List[Notification])
async def get_notifications(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    tenant_id: Optional[uuid.UUID] = Depends(get_optional_active_tenant_id),
):
    """
    Fetch unread notifications. Scoped by active tenant.
    If no tenant active and user is admin, returns platform notifications.
    """
    # If user is admin and in platform mode (no tenant), get platform notifs
    if current_user.platform_role == "admin" and not tenant_id:
        return NotificationService.get_unread(db, tenant_id=None)

    # Otherwise return tenant-scoped
    if not tenant_id:
        return []

    return NotificationService.get_unread(db, tenant_id=tenant_id)


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a notification as read.
    """
    notif = NotificationService.mark_as_read(db, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success"}
