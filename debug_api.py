import sys
import os

# Add apps/api to path
sys.path.append(os.path.join(os.getcwd(), 'apps', 'api'))

try:
    from app.main import app
    print("SUCCESS: App loaded correctly.")
except Exception as e:
    import traceback
    print("FAILED: App failed to load.")
    traceback.print_exc()
