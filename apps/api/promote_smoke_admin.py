import os
from sqlmodel import Session, create_engine, select
from app.models.models import User
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def promote_user():
    email = "smoke@entrega.space"
    with Session(engine) as session:
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        
        if not user:
            print(f"❌ User {email} not found")
            return
            
        print(f"✅ Found user: {user.full_name} ({user.id})")
        user.platform_role = "admin"
        session.add(user)
        session.commit()
        print(f"🚀 User {email} is now a PLATFORM ADMIN")

if __name__ == "__main__":
    promote_user()
