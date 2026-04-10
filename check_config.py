import os
import sys

# Add apps/api to path
sys.path.append(os.path.join(os.getcwd(), "apps", "api"))

# Mock environment variables to match apps/api/.env for the test
from dotenv import load_dotenv

load_dotenv("apps/api/.env")

from app.core.config import settings

print(f"PROJECT_NAME: {settings.PROJECT_NAME}")
print(f"DATABASE_URL: {settings.DATABASE_URL}")
print(f"SUPABASE_URL: {settings.SUPABASE_URL}")
print(f"SUPABASE_JWT_SECRET (masked): {settings.SUPABASE_JWT_SECRET[:4]}...")

# Check if JWKS is reachable
import httpx
import asyncio


async def test_jwks():
    jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    print(f"Testing JWKS URL: {jwks_url}")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(jwks_url)
            print(f"JWKS Response Status: {response.status_code}")
            if response.status_code == 200:
                print("✅ JWKS Reachable!")
            else:
                print(f"❌ JWKS Unreachable: {response.text[:100]}")
    except Exception as e:
        print(f"❌ JWKS Network Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_jwks())
