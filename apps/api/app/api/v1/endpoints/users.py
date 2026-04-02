from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles
from app.models.models import User
from uuid import UUID
from typing import List, Optional

router = APIRouter()

@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns the current authenticated user's information."""
    return current_user

@router.get("/", response_model=List[User], dependencies=[Depends(require_roles(["owner"]))])
async def list_users(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List all users for the tenant (owner only)."""
    users = db.exec(
        select(User).where(User.tenant_id == current_user.tenant_id)
    ).all()
    return users

@router.post("/", response_model=User, dependencies=[Depends(require_roles(["owner"]))])
async def create_user(
    email: str,
    full_name: str,
    role: str = "operator",
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new user (owner only)."""
    new_user = User(
        tenant_id=current_user.tenant_id,
        email=email,
        full_name=full_name,
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.patch("/{id}", response_model=User, dependencies=[Depends(require_roles(["owner"]))])
async def update_user(
    id: UUID,
    full_name: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update a user (owner only)."""
    user = db.get(User, id)
    if not user or user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    if full_name is not None:
        user.full_name = full_name
    if role is not None:
        user.role = role
    if is_active is not None:
        user.is_active = is_active
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
