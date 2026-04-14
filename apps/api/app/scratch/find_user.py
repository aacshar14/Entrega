
from app.core.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT u.id, u.email FROM users u JOIN tenant_users tu ON u.id = tu.user_id WHERE tu.tenant_id = '923eae6a-8157-4995-96ff-0da24a82e9e1' LIMIT 1"))
    print(res.first())
