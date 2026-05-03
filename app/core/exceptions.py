from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.core.logger import logger

class CommerceLensException(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class ScraperException(CommerceLensException):
    pass

class AIServiceException(CommerceLensException):
    pass

async def commerce_lens_exception_handler(request: Request, exc: CommerceLensException):
    logger.error(f"Error: {exc.message} | Path: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.message,
            "path": request.url.path
        }
    )

async def generic_exception_handler(request: Request, exc: Exception):
    logger.critical(f"Unhandled Exception: {str(exc)} | Path: {request.url.path}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "An unexpected error occurred. Our team has been notified.",
            "path": request.url.path
        }
    )
