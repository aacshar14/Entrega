import os, sqlmodel
from app.models.models import User
sqlmodel.load_dotenv = lambda: None 
engine = sqlmodel.create_engine(os.getenv('DATABASE_URL'))
with sqlmodel.Session(engine) as s:
    u = s.exec(sqlmodel.select(User).where(User.email == 'smoke@entrega.space')).first()
    if not u: u = User(email='smoke@entrega.space', full_name='Smoke', platform_role='admin')
    else: u.platform_role = 'admin'
    s.add(u); s.commit()
    print('DONE')
