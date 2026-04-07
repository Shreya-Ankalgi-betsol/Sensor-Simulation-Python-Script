"""
Global error handler middleware for consistent error responses.
All unhandled exceptions return standardized ApiErrorResponse.
"""

import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.schemas.api_response import ApiErrorResponse
from app.config import settings

logger = logging.getLogger(__name__)


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch all unhandled exceptions and return standardized error response.
    """
    logger.error(f"Unhandled exception: {type(exc).__name__}: {exc}", exc_info=True)
    
    error_response = ApiErrorResponse(
        success=False,
        error="Internal server error",
        details=str(exc) if settings.debug else None,
    )
    
    return JSONResponse(
        status_code=500,
        content=error_response.model_dump(mode="json"),
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handle Pydantic validation errors with clear error details.
    """
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"][1:]),
            "message": error["msg"],
            "type": error["type"],
        })
    
    error_response = ApiErrorResponse(
        success=False,
        error="Validation error",
        details=str(errors) if settings.debug else "Invalid request data",
    )
    
    return JSONResponse(
        status_code=422,
        content=error_response.model_dump(mode="json"),
    )
