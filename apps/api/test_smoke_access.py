import httpx
import os
import json
from dotenv import load_dotenv

load_dotenv()

# Config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
EMAIL = "smoke@entrega.space"
# In your local .env this might be different, but for testing we use the smoke credentials
PASSWORD = os.getenv("SMOKE_USER_PASSWORD", "verify_manually") 
API_BASE_URL = "https://api.entrega.space/api/v1"

def test_smoke_dashboard():
    print(f"AUTH: Authenticating {EMAIL}...")
    
    auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }
    data = {
        "email": EMAIL,
        "password": PASSWORD
    }
    
    with httpx.Client() as client:
        # 1. Login
        try:
            r = client.post(auth_url, headers=headers, json=data)
            r.raise_for_status()
            token = r.json().get("access_token")
            print("AUTH SUCCESS: Token acquired")
        except Exception as e:
            print(f"AUTH FAILED: {e}")
            if hasattr(e, 'response'):
                print(f"Response: {e.response.text}")
            return

        # 2. Check Dashboard Access
        print(f"TEST: Testing Dashboard Access: {API_BASE_URL}/dashboard/")
        api_headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }
        
        try:
            r = client.get(f"{API_BASE_URL}/dashboard/", headers=api_headers)
            print(f"API: Response Code: {r.status_code}")
            if r.status_code == 200:
                print("FINAL: SUCCESS: Smoke user has dashboard access!")
            else:
                print(f"FINAL: FAILED: {r.text}")
        except Exception as e:
            print(f"API ERROR: API Request Failed: {e}")

if __name__ == "__main__":
    test_smoke_dashboard()
