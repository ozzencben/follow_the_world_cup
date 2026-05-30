from contextlib import asynccontextmanager
from fastapi import FastAPI
from loguru import logger
from app.utils.logger import setup_app_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ==========================================
    # STARTUP EVENT HANDLING
    # ==========================================
    # Initialize structural logger
    setup_app_logging()
    logger.info("Initializing FollowTheWorldCup.com Backend Application...")
    logger.info("FastAPI lifespan startup hook completed.")

    yield

    # ==========================================
    # SHUTDOWN EVENT HANDLING
    # ==========================================
    logger.info("Shutting down FollowTheWorldCup.com Backend Application...")
    logger.info("Closing all external active connections & sessions...")
    logger.info("FastAPI lifespan shutdown hook completed.")
