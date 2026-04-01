from fastapi import Header, HTTPException
from uuid import UUID

async def get_tenant_id(x_tenant_id: str = Header(...)) -> UUID:
    """
    Dependency to extract and validate the Tenant ID from headers.
    In a real app, this would also verify that the tenant exists in the DB.
    """
    try:
        return UUID(x_tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail="Invalid Tenant ID format. Must be a valid UUID."
        )
