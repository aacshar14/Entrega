from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from uuid import UUID

from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles
from app.models.models import User

router = APIRouter()

@router.get("/me", response_model=User)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Returns the currently authenticated user's profile.
    """
    return current_user

@router.get("/", response_model=List[User])
async def list_users(
    db: Session = Depends(get_session),
    current_user: User = Depends(require_roles(["owner", "admin"]))
):
    """
    Lists all users for the current tenant.
    Only accessible by owners and admins.
    """
    statement = select(User).where(User.tenant_id == current_user.tenant_id)
    users = db.exec(statement).all()
    return users

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: User,
    db: Session = Depends(get_session),
    current_user: User = Depends(require_roles(["owner", "admin"]))
):
    """
    Creates a new user in the current tenant.
    """
    # Enforce current tenant
    user_data.tenant_id = current_user.tenant_id
    
    # Check if user already exists
    statement = select(User).where(User.email == user_data.email)
    existing_user = db.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    db.add(user_data)
    db.commit()
    db.refresh(user_data)
    return user_data

@router.patch("/{user_id}", response_model=User)
async def update_user(
    user_id: UUID,
    user_update: dict, # Simple dict for patch, in prod use a schema
    db: Session = Depends(get_session),
    current_user: User = Depends(require_roles(["owner", "admin"]))
):
    """
    Updates a user's details.
    """
    statement = select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    user = db.exec(statement).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Apply updates
    for key, value in user_update.items():
        if hasattr(user, key) and key not in ["id", "tenant_id", "email"]:
            setattr(user, key, value)
            
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
