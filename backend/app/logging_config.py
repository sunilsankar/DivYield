import logging
from logging.handlers import RotatingFileHandler
from app.config import settings

def setup_logging():
    """Configures structured file and console logging."""
    log_format = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    formatter = logging.Formatter(log_format, date_format)

    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Avoid duplicate handlers on re-entry
    if not root_logger.handlers:
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        console_handler.setLevel(logging.INFO)
        root_logger.addHandler(console_handler)

    # Ensure log directory exists
    settings.log_path.parent.mkdir(parents=True, exist_ok=True)

    # Check if file handler already exists
    has_file_handler = any(isinstance(h, RotatingFileHandler) for h in root_logger.handlers)
    if not has_file_handler:
        # 5 MB max per file, keep 3 backup copies
        file_handler = RotatingFileHandler(
            filename=str(settings.log_path),
            maxBytes=5 * 1024 * 1024,
            backupCount=3,
            encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.INFO)
        root_logger.addHandler(file_handler)

    root_logger.info("Logging initialized. Writing to %s", str(settings.log_path))
