from loguru import logger


class BaseService:
    """
    Base Service class representing the root interface for all business logic.
    Provides standard logging wrappers and common utility methods.
    """

    def __init__(self):
        self.logger = logger.bind(service=self.__class__.__name__)
        self.logger.debug("Service layer initialized.")
