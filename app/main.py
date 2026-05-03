from fastapi import FastAPI
from app.api.v1 import health, review, aeo
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CommerceLens-AI: Advanced Review Analysis & AEO Optimization"
)

# Include routers
app.include_router(health.router, prefix="/api/v1/health", tags=["Health"])
app.include_router(review.router, prefix="/api/v1/reviews", tags=["Reviews"])
app.include_router(aeo.router, prefix="/api/v1/aeo", tags=["AEO"])

@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}
