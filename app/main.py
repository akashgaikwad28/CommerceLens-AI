import sys
import asyncio

# Fix for Windows: Playwright requires ProactorEventLoop to start subprocesses
if sys.platform == 'win32':
    # Ensure the policy is set before any loop is created
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, Request
import logging

# Check loop type
loop_type = type(asyncio.get_event_loop_policy().get_event_loop()).__name__
print(f"DEBUG: Current Asyncio Loop: {loop_type}")
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

from contextlib import asynccontextmanager
from app.db.session import engine
from app.db.models import Base
from app.api import routes as job_routes

# ── Drop-in replacement for the lifespan block in main.py ──────────────────
#
# Replace your existing lifespan function with this one.
# It adds scraper shutdown so the browser process closes cleanly on app exit.

from contextlib import asynccontextmanager
from app.db.session import engine
from app.db.models import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize Database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    # 2. Cleanly shut down the persistent browser context on app exit
    from app.services.scraper_service import AmazonScraperService
    # The scraper singleton is held by the job worker — import it and shut it down
    try:
        from app.api.job_worker import scraper   # adjust import path if different
        await scraper.shutdown()
    except Exception:
        pass  # Non-fatal — process is exiting anyway
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="CommerceLens AI",
    description="AI-powered Review & AEO Analytics",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True if "*" not in settings.BACKEND_CORS_ORIGINS else False,
    allow_methods=["*"],
    allow_headers=["*"],
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

# Register the new background job routes
# The router prefix is already set to /api/v1 in routes.py, so we don't need to add it here
app.include_router(job_routes.router)

from app.api import routes_compare
app.include_router(routes_compare.router)

@app.get("/")
def root():
    return {"message": "CommerceLens AI is running 🚀"}
