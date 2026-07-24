"""
Request logging and error tracking middleware.
Structured JSON logging for all requests.
"""
import logging
import time
import traceback
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}',
)

logger = logging.getLogger("spatial_anubis")


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for structured request logging.
    Logs method, path, status code, duration, and captures exceptions.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Extract request info
        method = request.method
        path = request.url.path
        client_host = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Log successful request
            log_data = {
                "event": "request",
                "method": method,
                "path": path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "client_ip": client_host,
                "user_agent": user_agent,
            }
            
            log_level = logging.INFO if response.status_code < 400 else logging.WARNING
            logger.log(log_level, str(log_data))
            
            return response
            
        except Exception as exc:
            # Calculate duration even for errors
            duration_ms = (time.time() - start_time) * 1000
            
            # Log exception
            log_data = {
                "event": "request_exception",
                "method": method,
                "path": path,
                "status_code": 500,
                "duration_ms": round(duration_ms, 2),
                "client_ip": client_host,
                "user_agent": user_agent,
                "exception": str(exc),
                "traceback": traceback.format_exc(),
            }
            
            logger.error(str(log_data))
            
            # Re-raise to let FastAPI handle the response
            raise


class ErrorTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for capturing and tracking unhandled exceptions.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:
            # Log detailed error info
            error_data = {
                "event": "unhandled_exception",
                "exception_type": type(exc).__name__,
                "exception_message": str(exc),
                "traceback": traceback.format_exc(),
                "path": request.url.path,
                "method": request.method,
            }
            
            logger.error(str(error_data))
            
            # Re-raise
            raise
