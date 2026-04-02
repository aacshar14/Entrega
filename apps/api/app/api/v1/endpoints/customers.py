from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select, func
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles
from app.models.models import User, Customer, CustomerBalance, OnboardingEvent
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, EmailStr
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

@router.get("/", response_model=List[Customer], dependencies=[Depends(require_roles(["owner", "operator"]))])
async def list_customers(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List all customers (owner, operator)."""
    customers = db.exec(
        select(Customer).where(Customer.tenant_id == current_user.tenant_id)
    ).all()
    return customers

@router.post("/", response_model=Customer, dependencies=[Depends(require_roles(["owner"]))])
async def create_customer(
    name: str,
    phone_number: str,
    email: Optional[str] = None,
    address: Optional[str] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new customer (owner only)."""
    new_customer = Customer(
        tenant_id=current_user.tenant_id,
        name=name,
        phone_number=phone_number,
        email=email,
        address=address,
        notes=notes,
        created_by_user_id=current_user.id
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer

@router.post("/import/preview", response_model=ImportPreviewResponse, dependencies=[Depends(require_roles(["owner"]))])
async def import_customers_preview(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Step 1: Preview CSV data for customer import.
    """
    content = await file.read()
    string_io = io.StringIO(content.decode('utf-8'))
    reader = csv.DictReader(string_io)
    
    # Get existing customers to detect duplicates
    existing_customers = db.exec(
        select(Customer).where(Customer.tenant_id == current_user.tenant_id)
    ).all()
    existing_phones = {c.phone_number for c in existing_customers if c.phone_number}
    existing_names = {c.name.lower() for c in existing_customers}
    
    rows_preview = []
    total = 0
    valid_count = 0
    invalid_count = 0
    duplicate_count = 0
    
    for i, row in enumerate(reader, 1):
        total += 1
        errors = []
        name = row.get("name", "").strip()
        phone = row.get("phone", "").strip()
        email = row.get("email", "").strip()
        initial_balance = row.get("initial_balance", "0").strip()
        notes = row.get("notes", "").strip()
        
        # Validation
        if not name:
            errors.append("Name is required")
            
        # Normalization
        normalized_phone = re.sub(r'\D', '', phone) if phone else None
        if normalized_phone and not (10 <= len(normalized_phone) <= 15):
             errors.append("Invalid phone number format")
             
        # Email check
        if email and not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            errors.append("Invalid email format")
            
        # Balance check
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
                notes=notes
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

@router.post("/import/commit", dependencies=[Depends(require_roles(["owner"]))])
async def import_customers_commit(
    request: ImportCommitRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Step 2: Commit valid customer rows to the database.
    """
    tenant_id = current_user.tenant_id
    created_count = 0
    skipped_duplicates = 0
    
    # Get existing for final duplicate check
    existing_customers = db.exec(
        select(Customer).where(Customer.tenant_id == tenant_id)
    ).all()
    existing_phones = {c.phone_number for c in existing_customers if c.phone_number}
    existing_names = {c.name.lower() for c in existing_customers}

    for row in request.rows:
        # Final duplicate check before save
        if row.name.lower() in existing_names or (row.phone and row.phone in existing_phones):
            skipped_duplicates += 1
            continue
            
        # Create Customer
        new_customer = Customer(
            tenant_id=tenant_id,
            name=row.name,
            phone_number=row.phone,
            email=row.email,
            notes=row.notes,
            created_by_user_id=current_user.id
        )
        db.add(new_customer)
        db.flush() # Populate ID
        
        # Create Balance if applies
        if row.initial_balance != 0:
            new_balance = CustomerBalance(
                tenant_id=tenant_id,
                customer_id=new_customer.id,
                balance=-row.initial_balance, # amount user owes us
                last_updated=datetime.now(timezone.utc)
            )
            db.add(new_balance)
            
        created_count += 1
        existing_names.add(row.name.lower())
        if row.phone:
            existing_phones.add(row.phone)
            
    # Record event
    event = OnboardingEvent(
        tenant_id=tenant_id,
        event_type="customer_import",
        metadata_json=f'{{"count": {created_count}, "duplicates_skipped": {skipped_duplicates}}}',
        created_by_user_id=current_user.id
    )
    db.add(event)
    
    db.commit()
    
    return {
        "status": "success",
        "created_count": created_count,
        "skipped_duplicates": skipped_duplicates
    }

@router.patch("/{id}", response_model=Customer, dependencies=[Depends(require_roles(["owner"]))])
async def update_customer(
    id: UUID,
    name: Optional[str] = None,
    phone_number: Optional[str] = None,
    address: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update a customer (owner only)."""
    customer = db.get(Customer, id)
    if not customer or customer.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if name is not None:
        customer.name = name
    if phone_number is not None:
        customer.phone_number = phone_number
    if address is not None:
        customer.address = address
        
    customer.updated_by_user_id = current_user.id
    customer.updated_at = datetime.now(timezone.utc)
    
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer
