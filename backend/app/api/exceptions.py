from typing import Any
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from loguru import logger


class AppException(Exception):
    """
    Base Exception class for the entire application.
    All custom domain exceptions should inherit from this.
    """

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        detail: Any = None,
    ):
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class NotFoundException(AppException):
    """
    Raised when a requested resource is not found (404).
    """

    def __init__(
        self, message: str = "Requested resource not found", detail: Any = None
    ):
        super().__init__(message=message, status_code=404, detail=detail)


class ExternalAPIException(AppException):
    """
    Raised when downstream third-party football/statistics APIs fail (502).
    """

    def __init__(
        self, message: str = "External sports data provider error", detail: Any = None
    ):
        super().__init__(message=message, status_code=502, detail=detail)


class AIModelException(AppException):
    """
    Raised when AI processing or Google Gemini model prompts fail (500).
    """

    def __init__(
        self, message: str = "AI prediction engine failure", detail: Any = None
    ):
        super().__init__(message=message, status_code=500, detail=detail)


def register_exception_handlers(app: FastAPI) -> None:
    """
    Binds the custom exception handlers globally to the FastAPI application.
    """

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.error(
            f"Custom Exception Intercepted: {exc.__class__.__name__} "
            f"| HTTP Status: {exc.status_code} "
            f"| Message: {exc.message} "
            f"| Details: {exc.detail}"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "type": exc.__class__.__name__,
                    "message": exc.message,
                    "detail": exc.detail,
                },
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception(
            f"CRITICAL: Unhandled Exception occurred at path {request.url.path}"
        )
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "type": "InternalServerError",
                    "message": "An unexpected error occurred on the server.",
                    "detail": str(exc)
                    if app.debug or settings_dev(app)
                    else None,
                },
            },
        )


def settings_dev(app: FastAPI) -> bool:
    # Helper to check if running in dev environment dynamically
    try:
        from app.core.config import settings

        return settings.ENVIRONMENT == "development"
    except Exception:
        return False
