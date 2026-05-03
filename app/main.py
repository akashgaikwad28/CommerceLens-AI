from fastapi import FastAPI, Request
import time
import sentry_sdk
from app.api.v1 import health, review, aeo
from app.core.exceptions import CommerceLensException, commerce_lens_exception_handler, generic_exception_handler
from app.core.logger import logger
from app.core.config import settings

# Initialize Sentry
if hasattr(settings, "SENTRY_DSN") and settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

app = FastAPI(
    title="CommerceLens AI",
    description="AI-powered Review & AEO Analytics",
    version="1.0.0"
)

# Exception Handlers
app.add_exception_handler(CommerceLensException, commerce_lens_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = "{0:.2f}".format(process_time)
    logger.info(f"Method: {request.method} Path: {request.url.path} Status: {response.status_code} Duration: {formatted_process_time}ms")
    return response

# Register routes
app.include_router(health.router, prefix="/api/v1")
app.include_router(review.router, prefix="/api/v1")
app.include_router(aeo.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "CommerceLens AI is running 🚀"}
