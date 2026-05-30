from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.exceptions import register_exception_handlers
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.lifespan import lifespan

# Instantiate FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
    debug=(settings.ENVIRONMENT == "development"),
)

# Apply dynamic CORS configurations
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register custom exception handlers globally
register_exception_handlers(app)

# Include structural versioned endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)
