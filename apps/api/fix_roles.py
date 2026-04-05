from sqlmodel import Session, select, create_engine
from app.models.models import User, Tenant, TenantUser
from app.core.config import settings
import uuid

# Hugo (User I am talking to)
HUGO_EMAIL = "gonzalo.sc8@gmail.com" # Obtained from context/metadata
# Leonardo (The client)
LEONARDO_EMAIL = "leonardo@chocobites.com"

engine = create_engine(str(settings.DATABASE_URL))

def fix_identities():
    with Session(engine) as db:
        # 1. Hugo (Platform Admin)
        hugo = db.exec(select(User).where(User.email == HUGO_EMAIL)).first()
        if hugo:
            print(f"DEBUG: Found Hugo ({HUGO_EMAIL}). Updating to Platform Admin...")
            hugo.platform_role = "admin"
            hugo.full_name = "Hugo (EntréGA Boss)"
            db.add(hugo)
        else:
            print("DEBUG: Hugo not found in User table.")

        # 2. Leonardo (Standard User / Client)
        leonardo = db.exec(select(User).where(User.email == LEONARDO_EMAIL)).first()
        if leonardo:
            print(f"DEBUG: Found Leonardo ({LEONARDO_EMAIL}). Updating to regular user...")
            leonardo.platform_role = "user"
            db.add(leonardo)
        
        db.commit()
        print("DEBUG: Roles fixed successfully.")

if __name__ == "__main__":
    fix_identities()
