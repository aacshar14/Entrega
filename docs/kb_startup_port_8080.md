# KB: Solving Cloud Run 'PORT=8080' Startup Failures

## Error Description
The Google Cloud Run container fails with the following message:
`ERROR: (gcloud.run.deploy) The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout.`

This occurs when the FastAPI/Uvicorn process crashes or hangs during the module import/initialization phase, before it can bind to the network socket.

## Recurring Root Causes in Entrega Project (Last 3 Days Analysis)

### 1. Missing Sub-Dependencies (e.g., `slowapi` + `limits`)
Adding a high-level library like `slowapi` without its required engine (`limits`) causes a `ModuleNotFoundError` at the top of `main.py`.
*   **Fix:** Ensure `limits` is explicitly pinned in `requirements.txt`.

### 2. Circular Import Deadlocks
The `api_router` often imports nearly every file in the project. If `main.py` imports `api_router` at the top level, and any endpoint imports `dependencies` or `models` that eventually reference `main.py` or each other in a loop, the Python interpreter will crash.
*   **Fix:** Use the **Lazy Load Pattern** in `main.py`.

### 3. Pydantic v2 Model Rebuild Failures
Calling `Model.model_rebuild()` in `models.py` before all forward-referenced classes are initialized can halt the import process.
*   **Fix:** Avoid `model_rebuild()` at the top level. Use string-based type hints (e.g., `"TenantInfo"`) and let Pydantic resolve them at runtime.

### 4. Database Engine Initialization
If `create_engine` is called at the top level of `db.py` and the environment variable `DATABASE_URL` is missing or malformed, it might not crash immediately but can cause the first request handler to hang if not handled.

---

## Preventative Architecture (The "Entrega Pattern")

### Standard `main.py` Structure
```python
from fastapi import FastAPI
import time

# 1. Setup logging before anything else
from app.core.logging import setup_logging
setup_logging()

# 2. Use a factory function for the app
def get_application() -> FastAPI:
    app = FastAPI(...)
    
    # 3. Lazy-load routers to break circularity
    from app.api.v1.api import api_router
    app.include_router(api_router)
    
    return app

app = get_application()
```

## Troubleshooting Steps
1.  **Check Cloud Logs:** Look for `ImportError` or `SyntaxError` in the Revision Logs.
2.  **Local Simulation:**
    Run: `PYTHONPATH=. python -c "import app.main"`
    If this fails, the container will fail.
3.  **Verify `requirements.txt`:** Ensure `uvicorn`, `gunicorn`, and all sub-dependencies (like `limits`) are present.
