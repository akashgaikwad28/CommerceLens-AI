"""
Retry Utility Module
====================
Provides a production-grade retry decorator for async functions.
Used primarily by the scraper and AI services to handle transient failures.

Usage:
    @retry(max_retries=2, delay=3)
    async def my_flaky_function():
        ...
"""

import asyncio
from functools import wraps
from typing import Callable, Any
from app.core.logger import get_logger

logger = get_logger("retry")


def retry(max_retries: int = 2, delay: float = 2.0, backoff_factor: float = 2.0):
    """
    Async retry decorator with exponential backoff.

    Args:
        max_retries: Number of times to retry after the initial attempt.
        delay: Initial delay (in seconds) between retries.
        backoff_factor: Multiplier applied to delay after each retry.
                        e.g., delay=2, backoff=2 → waits 2s, 4s, 8s...

    Raises:
        The original exception if all retries are exhausted.
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exception = None
            current_delay = delay

            # Total attempts = 1 (initial) + max_retries
            for attempt in range(1, max_retries + 2):
                try:
                    return await func(*args, **kwargs)

                except Exception as e:
                    last_exception = e
                    # If this was the last attempt, don't log "retrying"
                    if attempt > max_retries:
                        logger.error(
                            f"[{func.__name__}] All {max_retries + 1} attempts failed. "
                            f"Final error: {str(e)}"
                        )
                        raise

                    logger.warning(
                        f"[{func.__name__}] Attempt {attempt}/{max_retries + 1} failed: {str(e)}. "
                        f"Retrying in {current_delay}s..."
                    )
                    await asyncio.sleep(current_delay)
                    current_delay *= backoff_factor  # Exponential backoff

        return wrapper
    return decorator
