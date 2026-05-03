import logging
import sys
from typing import Any

# Configure logging format
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

def setup_logging():
    # Base configuration
    logging.basicConfig(
        level=logging.INFO,
        format=LOG_FORMAT,
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("app.log")
        ]
    )
    
    # Disable propagation for some noisy libraries if needed
    logging.getLogger("uvicorn.access").propagate = False

def get_logger(name: str):
    return logging.getLogger(name)

# Initialize logging on module import
setup_logging()
logger = get_logger("CommerceLensAI")
