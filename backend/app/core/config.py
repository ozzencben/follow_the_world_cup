from typing import Any, List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    # Core Configurations
    PROJECT_NAME: str = "FollowTheWorldCup API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"  # development, staging, production
    LOG_LEVEL: str = "INFO"

    # CORS Configurations
    BACKEND_CORS_ORIGINS: Any = []
    BACKEND_CORS_ORIGIN_REGEX: str | None = None
    ALLOWED_ORIGINS: Any = None

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(item) for item in v]
        return []

    @model_validator(mode="after")
    def merge_allowed_origins(self) -> "Settings":
        if self.ALLOWED_ORIGINS:
            v = self.ALLOWED_ORIGINS
            parsed_origins = []
            if isinstance(v, str):
                if v.startswith("[") and v.endswith("]"):
                    import json
                    try:
                        parsed_origins = json.loads(v)
                    except Exception:
                        pass
                else:
                    parsed_origins = [i.strip() for i in v.split(",") if i.strip()]
            elif isinstance(v, list):
                parsed_origins = [str(item) for item in v]
                
            for origin in parsed_origins:
                if origin not in self.BACKEND_CORS_ORIGINS:
                    self.BACKEND_CORS_ORIGINS.append(origin)
        return self

    # External Integrations & Redirections
    KREOSUS_URL: str = "https://kreosus.com/httpsgithubcomozzencben"

    # External FIFA API endpoints
    FIFA_TEAMS_API_URL: str = "https://cxm-api.fifa.com/fifaplusweb/api/sections/teamsModule/4v5Yng3VdGD9c1cpnOIff1?locale=en&limit=200"
    FIFA_SQUADS_API_URL: str = "https://play.fifa.com/json/bracket_predictor/squads.json"
    FIFA_ROUNDS_API_URL: str = "https://play.fifa.com/json/bracket_predictor/rounds.json"

    # Secret Keys (FollowTheWorldCup integrations)
    FOOTBALL_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None


# Instantiate settings globally
settings = Settings()

