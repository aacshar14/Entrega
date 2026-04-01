import logging
import sys
import structlog
from app.core.config import settings

def setup_logging():
    shared_processors = [
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]

    if settings.ENVIRONMENT == "development":
        logging_processors = [
            *shared_processors,
            structlog.dev.ConsoleRenderer()
        ]
    else:
        logging_processors = [
            *shared_processors,
            structlog.processors.JSONRenderer()
        ]

    structlog.configure(
        processors=logging_processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )

logger = structlog.get_logger()
