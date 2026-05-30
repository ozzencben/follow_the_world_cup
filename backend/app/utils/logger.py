import logging
import sys
from pathlib import Path
from loguru import logger
from app.core.config import settings


class InterceptHandler(logging.Handler):
    """
    Custom handler to redirect standard Python logging messages to Loguru.
    Ensures third-party library logs (like uvicorn or fastapi) follow our Loguru format.
    """

    def emit(self, record: logging.LogRecord) -> None:
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where the logged message originated
        frame = sys._getframe(6)
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back

        logger.opt(depth=6, exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_app_logging() -> None:
    """
    Configures Loguru handlers and intercepts standard library logging.
    Sets up a colorful stdout console handler and a daily rotating file handler.
    """
    log_level = settings.LOG_LEVEL.upper()

    # Clear existing standard log handlers
    logging.root.handlers = []

    # Configure Loguru settings
    logger.configure(
        handlers=[
            {
                "sink": sys.stdout,
                "level": log_level,
                "format": (
                    "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
                    "<level>{level: <8}</level> | "
                    "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
                    "<level>{message}</level>"
                ),
            }
        ]
    )

    # Establish log folder for production logging persistence
    log_dir = Path("logs")
    log_dir.mkdir(parents=True, exist_ok=True)

    # File Logging: daily rotating, zipped, kept for 30 days
    logger.add(
        sink=log_dir / "app.log",
        level=log_level,
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
        rotation="1 day",
        retention="30 days",
        compression="zip",
        enqueue=True,  # Thread-safe / Async safe
        backtrace=True,
        diagnose=settings.ENVIRONMENT == "development",
    )

    # Propagate standard library logging back into Loguru
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)

    # Redirect specific loggers
    for logger_name in (
        "uvicorn",
        "uvicorn.access",
        "uvicorn.error",
        "fastapi",
    ):
        logging_logger = logging.getLogger(logger_name)
        logging_logger.handlers = [InterceptHandler()]
        logging_logger.propagate = False

    logger.info("Structured logging initialized via Loguru successfully.")
