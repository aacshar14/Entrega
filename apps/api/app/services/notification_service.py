from sqlmodel import Session, select
from app.models.models import Notification
from typing import Optional, Dict
import uuid
from datetime import datetime, timezone


class NotificationService:
    @staticmethod
    def notify(
        db: Session,
        category: str,
        title: str,
        message: str,
        tenant_id: Optional[uuid.UUID] = None,
        priority: str = "medium",
        cta_label: Optional[str] = None,
        cta_link: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ) -> Notification:
        import json

        notif = Notification(
            tenant_id=tenant_id,
            category=category,
            priority=priority,
            title=title,
            message=message,
            cta_label=cta_label,
            cta_link=cta_link,
            metadata_json=json.dumps(metadata) if metadata else None,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif

    @staticmethod
    def get_unread(db: Session, tenant_id: Optional[uuid.UUID] = None, limit: int = 10):
        # tenant_id is None for platform admin notifications
        stmt = (
            select(Notification)
            .where(Notification.is_read == False, Notification.tenant_id == tenant_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return db.exec(stmt).all()

    @staticmethod
    def mark_as_read(db: Session, notification_id: uuid.UUID):
        notif = db.get(Notification, notification_id)
        if notif:
            notif.is_read = True
            db.add(notif)
            db.commit()
            db.refresh(notif)
        return notif
