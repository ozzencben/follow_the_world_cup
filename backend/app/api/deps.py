from app.core.config import Settings, settings
from app.services.football_data import FootballDataService
from app.services.prediction_ai import PredictionAIService



def get_settings() -> Settings:
    """
    Dependency to access global application settings validated by Pydantic.
    """
    return settings


