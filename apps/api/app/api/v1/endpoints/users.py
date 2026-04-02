from app.models.models import User, Tenant, TenantUser, MeResponse, MembershipInfo

router = APIRouter()

@router.get("/me", response_model=MeResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    active_tenant: Tenant = Depends(get_active_tenant),
    db: Session = Depends(get_session)
):
    """Returns the current authenticated user's information along with memberships."""
    # Get all memberships for the user
    memberships_data = db.exec(
        select(TenantUser, Tenant)
        .join(Tenant, Tenant.id == TenantUser.tenant_id)
        .where(TenantUser.user_id == current_user.id)
    ).all()

    memberships = [
        MembershipInfo(
            tenant_id=m.id,
            tenant_name=t.name,
            tenant_slug=t.slug,
            tenant_role=m.tenant_role,
            is_default=m.is_default,
            status=t.status
        )
        for m, t in memberships_data
    ]

    return MeResponse(
        user=current_user,
        active_tenant=active_tenant,
        memberships=memberships
    )

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
