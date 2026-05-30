from fastapi import APIRouter
from app.api.v1.endpoints import health, teams, rounds, squads, winners, elo

api_router = APIRouter()

# Incorporate sub-routers into core API Router
api_router.include_router(
    health.router, prefix="/health", tags=["System Health Checks"]
)
api_router.include_router(
    teams.router, prefix="/teams", tags=["World Cup Teams"]
)
api_router.include_router(
    rounds.router, prefix="/rounds", tags=["World Cup Rounds"]
)
api_router.include_router(
    squads.router, prefix="/squads", tags=["World Cup Squads"]
)
api_router.include_router(
    winners.router, prefix="/winners", tags=["World Cup Winners"]
)
api_router.include_router(
    elo.router, prefix="/elo", tags=["World Cup Elo Ratings"]
)


