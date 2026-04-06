import uuid
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

logger = structlog.get_logger()

class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Add Request ID
        request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        
        # 2. Timing
        start_time = time.time()
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        response.headers["X-Request-Id"] = request_id
        response.headers["X-Process-Time"] = str(process_time)
        
        # 3. Request Status Logging
        logger.info("api_request", 
                    method=request.method, 
                    path=request.url.path, 
                    status_code=response.status_code, 
                    duration=process_time)
        
        return response
