# Retry logic placeholder
import asyncio
from functools import wraps

def retry(times=3, delay=1):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for i in range(times):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    if i == times - 1: raise
                    await asyncio.sleep(delay)
            return await func(*args, **kwargs)
        return wrapper
    return decorator
