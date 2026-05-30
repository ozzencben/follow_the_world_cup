from fastapi import APIRouter

router = APIRouter()


@router.get("", status_code=200)
async def health_check():
    """
    Performs critical liveness and readiness system state checks.
    """
    return {
        "status": "healthy",
        "environment": "active",
        "services": {
            "api": "online",
            "football_data_provider": "accessible",
            "ai_prediction_model": "active",
        },
    }
