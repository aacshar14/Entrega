from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select, func
from app.core.db import get_session
from app.core.dependencies import get_current_user, get_active_tenant, require_tenant_role
from app.models.models import User, Tenant, Customer, CustomerBalance, OnboardingEvent, CustomerAlias, Payment, InventoryMovement
from sqlalchemy import text
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
import csv
import io
import re

router = APIRouter()

# Schema for preview/commit
class CustomerImportRow(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    initial_balance: Optional[float] = 0.0
    notes: Optional[str] = None
    tier: str = "menudeo"

class ImportPreviewRow(BaseModel):
    row_index: int
    data: CustomerImportRow
    is_valid: bool
    errors: List[str] = []
    is_duplicate: bool = False

class ImportPreviewResponse(BaseModel):
    total_rows: int
    valid_rows_count: int
    invalid_rows_count: int
    duplicate_rows_count: int
    rows: List[ImportPreviewRow]

class ImportCommitRequest(BaseModel):
    rows: List[CustomerImportRow]

class CustomerCreate(BaseModel):
    name: str
    phone_number: str
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    tier: Optional[str] = "menudeo"

class CustomerResponse(BaseModel):
    id: UUID
    name: str
    phone_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    tier: str
    balance: float = 0.0
    created_at: datetime

@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    db: Session = Depends(get_session),
    active_tenant: Tenant = Depends(get_active_tenant)
):
    """List all customers for the active tenant with their current balance."""
    # Build query to join with CustomerBalance
    query = (
        select(Customer, CustomerBalance.balance)
        .outerjoin(CustomerBalance, Customer.id == CustomerBalance.customer_id)
        .where(Customer.tenant_id == active_tenant.id)
    )
    results = db.exec(query).all()
    
    response = []
    for customer, balance in results:
        resp = CustomerResponse(
            **customer.model_dump(),
            balance=float(balance) if balance is not None else 0.0
        )
        response.append(resp)
        
    return response

@router.post("", response_model=Customer)
async def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant: Tenant = Depends(get_active_tenant)
):
    """Create a new customer for the active tenant."""
    new_customer = Customer(
        tenant_id=active_tenant.id,
        name=customer_data.name,
        phone_number=customer_data.phone_number,
        email=customer_data.email,
        address=customer_data.address,
        notes=customer_data.notes,
        tier=customer_data.tier if customer_data.tier in ["mayoreo", "menudeo", "especial"] else "menudeo",
        created_by_user_id=current_user.id
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    
    # 💰 Initialize empty balance
    new_balance = CustomerBalance(
        tenant_id=active_tenant.id,
        customer_id=new_customer.id,
        balance=0.0,
        last_updated=datetime.now(timezone.utc)
    )
    db.add(new_balance)
    db.commit()

    return new_customer

@router.post("/import/preview", response_model=ImportPreviewResponse)
async def import_customers_preview(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    active_tenant: Tenant = Depends(get_active_tenant)
):
    """Step 1: Preview CSV data for customer import."""
    content = await file.read()
    string_io = io.StringIO(content.decode('utf-8'), newline='')
    reader = csv.DictReader(string_io)
    
    # Get existing customers to detect duplicates
    existing_customers = db.exec(
        select(Customer).where(Customer.tenant_id == active_tenant.id)
    ).all()
    existing_phones = {c.phone_number for c in existing_customers if c.phone_number}
    existing_names = {c.name.lower() for c in existing_customers}
    
    rows_preview = []
    total = 0
    valid_count = 0
    invalid_count = 0
    duplicate_count = 0
    
    # Get keys with fuzzy matching for case-insensitivity and extra spaces
    keys = {k.strip().lower(): k for k in reader.fieldnames}
    
    def get_val(row_data, fuzzy_list):
        for fl in fuzzy_list:
            if fl.lower() in keys:
                return (row_data.get(keys[fl.lower()]) or "").strip()
        return None

    for i, row in enumerate(reader, 1):
        total += 1
        errors = []
        
        # Robust Mapping
        name = get_val(row, ["name", "nombre", "cliente"]) or ""
        phone = get_val(row, ["phone", "teléfono", "telefono", "celular"])
        email = get_val(row, ["email", "correo", "mail"])
        initial_balance = get_val(row, ["initial_balance", "saldo", "deuda"]) or "0"
        notes = get_val(row, ["notes", "notas", "comentario"]) or ""
        tier = (get_val(row, ["tier", "nivel", "nivel de precio"]) or "menudeo").lower()
        
        if not name:
            errors.append("Name is required")
            
        normalized_phone = re.sub(r'\D', '', phone) if phone else None
        if normalized_phone and not (10 <= len(normalized_phone) <= 15):
             errors.append("Invalid phone number format")
             
        if email and not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            errors.append("Invalid email format")
            
        try:
            bal = float(initial_balance) if initial_balance else 0.0
        except ValueError:
            errors.append("Initial balance must be numeric")
            bal = 0.0
            
        is_duplicate = False
        if name.lower() in existing_names or (normalized_phone and normalized_phone in existing_phones):
            is_duplicate = True
            duplicate_count += 1
            
        is_valid = len(errors) == 0
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1
            
        rows_preview.append(ImportPreviewRow(
            row_index=i,
            data=CustomerImportRow(
                name=name,
                phone=normalized_phone,
                email=email,
                initial_balance=bal,
                notes=notes,
                tier=tier if tier in ["mayoreo", "menudeo", "especial"] else "menudeo"
            ),
            is_valid=is_valid,
            errors=errors,
            is_duplicate=is_duplicate
        ))
        
    return ImportPreviewResponse(
        total_rows=total,
        valid_rows_count=valid_count,
        invalid_rows_count=invalid_count,
        duplicate_rows_count=duplicate_count,
        rows=rows_preview
    )

@router.post("/import/commit")
async def import_customers_commit(
    request: ImportCommitRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant: Tenant = Depends(get_active_tenant)
):
    """Step 2: Commit valid customer rows to the database."""
    tenant_id = active_tenant.id
    created_count = 0
    updated_count = 0
    
    for row in request.rows:
        # Search for existing customer
        existing = db.exec(
            select(Customer).where(
                (Customer.tenant_id == tenant_id) & 
                ((func.lower(Customer.name) == row.name.lower()) | (Customer.phone_number == row.phone))
            )
        ).first()
        
        if existing:
            # Update existing
            existing.tier = row.tier if row.tier in ["mayoreo", "menudeo", "especial"] else "menudeo"
            existing.email = row.email or existing.email
            existing.notes = row.notes or existing.notes
            existing.updated_at = datetime.now(timezone.utc)
            db.add(existing)
            
            # Update or create balance
            balance_record = db.exec(
                select(CustomerBalance).where(CustomerBalance.customer_id == existing.id)
            ).first()
            
            if balance_record:
                # 🛡️ Hardening: Only overwrite if CSV balance is provided (non-zero)
                # to avoid wiping balances when re-importing to fix tiers/notes.
                if row.initial_balance != 0:
                    balance_record.balance = -row.initial_balance
                    balance_record.last_updated = datetime.now(timezone.utc)
                    db.add(balance_record)
            elif row.initial_balance != 0:
                new_balance = CustomerBalance(
                    tenant_id=tenant_id,
                    customer_id=existing.id,
                    balance=-row.initial_balance,
                    last_updated=datetime.now(timezone.utc)
                )
                db.add(new_balance)
            
            updated_count += 1
        else:
            # Create new
            new_customer = Customer(
                tenant_id=tenant_id,
                name=row.name,
                phone_number=row.phone,
                email=row.email,
                notes=row.notes,
                tier=row.tier if row.tier in ["mayoreo", "menudeo", "especial"] else "menudeo",
                created_by_user_id=current_user.id
            )
            db.add(new_customer)
            db.flush()
            
            if row.initial_balance != 0:
                new_balance = CustomerBalance(
                    tenant_id=tenant_id,
                    customer_id=new_customer.id,
                    balance=-row.initial_balance,
                    last_updated=datetime.now(timezone.utc)
                )
                db.add(new_balance)
            created_count += 1
            
    event = OnboardingEvent(
        tenant_id=tenant_id,
        event_type="customer_import",
        metadata_json=f'{{"created": {created_count}, "updated": {updated_count}}}',
        created_by_user_id=current_user.id
    )
    db.add(event)
    db.commit()
    return {"status": "success", "created": created_count, "updated": updated_count}

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    tier: Optional[str] = None
    balance: Optional[float] = None

@router.patch("/{id}", response_model=CustomerResponse)
async def update_customer(
    id: UUID,
    update_data: CustomerUpdate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant: Tenant = Depends(get_active_tenant)
):
    """Update a customer for the active tenant."""
    customer = db.get(Customer, id)
    if not customer or customer.tenant_id != active_tenant.id:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if update_data.name is not None:
        customer.name = update_data.name
    if update_data.phone_number is not None:
        customer.phone_number = update_data.phone_number
    if update_data.email is not None:
        customer.email = update_data.email
    if update_data.address is not None:
        customer.address = update_data.address
    if update_data.notes is not None:
        customer.notes = update_data.notes
    if update_data.tier is not None and update_data.tier in ["mayoreo", "menudeo", "especial"]:
        customer.tier = update_data.tier
        
    customer.updated_by_user_id = current_user.id
    customer.updated_at = datetime.now(timezone.utc)
    
    db.add(customer)
    
    # 💰 Synchronize Balance if provided
    if update_data.balance is not None:
        balance_record = db.exec(
            select(CustomerBalance).where(CustomerBalance.customer_id == customer.id)
        ).first()
        
        # Enforce consistency: balance in table is usually stored as negative for debt?
        # Actually Inbound Import says: balance = -row.initial_balance
        # We follow the same convention or allow absolute value?
        # User usually sees absolute value in UI ($650.00). 
        # But if it's debt, it should be stored as negative internally to facilitate SUMs.
        val_to_save = -abs(update_data.balance) if update_data.balance != 0 else 0.0
        
        if balance_record:
            balance_record.balance = val_to_save
            balance_record.last_updated = datetime.now(timezone.utc)
            db.add(balance_record)
        else:
            new_balance = CustomerBalance(
                tenant_id=active_tenant.id,
                customer_id=customer.id,
                balance=val_to_save,
                last_updated=datetime.now(timezone.utc)
            )
            db.add(new_balance)

    db.commit()
    db.refresh(customer)

    # Refetch with balance to ensure full state returns to UI
    balance_record = db.exec(
        select(CustomerBalance).where(CustomerBalance.customer_id == customer.id)
    ).first()

    return CustomerResponse(
        **customer.model_dump(),
        balance=abs(float(balance_record.balance)) if balance_record else 0.0
    )

@router.delete("/{id}")
async def delete_customer(
    id: UUID,
    db: Session = Depends(get_session),
    active_tenant: Tenant = Depends(get_active_tenant),
    _ = Depends(require_tenant_role(["owner"]))
):
    """Delete a customer (Owner only). Deep cleanup of all linked records."""
    customer = db.get(Customer, id)
    if not customer or customer.tenant_id != active_tenant.id:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Clean up dependencies
    db.execute(text("DELETE FROM customer_balances WHERE customer_id = :id"), {"id": id})
    db.execute(text("DELETE FROM customer_aliases WHERE customer_id = :id"), {"id": id})
    db.execute(text("UPDATE inventory_movements SET customer_id = NULL WHERE customer_id = :id"), {"id": id})
    db.execute(text("DELETE FROM payments WHERE customer_id = :id"), {"id": id})
    
    db.delete(customer)
    db.commit()
    return {"status": "success"}
