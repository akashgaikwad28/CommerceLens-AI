from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class AnalyzeRequest(BaseModel):
    product_url: HttpUrl = Field(..., description="Amazon product URL to analyze")
    max_pages: Optional[int] = Field(5, description="Maximum number of review pages to scrape (default 5)")

class AnalyzeResponse(BaseModel):
    job_id: Optional[str] = Field(None, description="UUID of the background job (None if cached result is returned)")
    status: str = Field(..., description="Job status (pending) or result status (completed if from cache)")
    cached_result: Optional[Dict[str, Any]] = Field(None, description="Immediate result if cache hit occurred")

class JobSummaryResponse(BaseModel):
    job_id: str
    product_name: Optional[str] = None
    status: str
    created_at: datetime

class JobMeta(BaseModel):
    created_at: datetime
    processing_time_ms: Optional[int] = None

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    meta: JobMeta

# --- Comparison Schemas ---

class CompareRequest(BaseModel):
    product_urls: List[HttpUrl] = Field(..., description="List of 2 to 5 Amazon product URLs to compare", min_length=2, max_length=5)

class CompareResponse(BaseModel):
    job_id: str
    status: str

class CompareResultResponse(BaseModel):
    status: str
    progress: int
    stage: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
