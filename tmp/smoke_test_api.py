import sys
import os

# Add the apps/api directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "apps", "api"))

print("Testing API import structure...")

try:
    from app.main import app
    print("✅ Success: app.main imported correctly.")
except ImportError as e:
    print(f"❌ Error: Could not import app.main. {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected Error during import: {e}")
    # Print traceback for debugging
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("Testing dependencies and core modules...")
try:
    from app.core.dependencies import require_roles, get_active_tenant_id
    from app.core.db import get_engine, get_session
    print("✅ Success: Core modules and helpers imported correctly.")
except ImportError as e:
    print(f"❌ Error in core imports: {e}")
    sys.exit(1)

print("\n🚀 All structural checks passed locally.")
