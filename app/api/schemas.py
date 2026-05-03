from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, Dict, Any

class AnalyzeRequest(BaseModel):
    product_url: HttpUrl = Field(..., description="Amazon product URL to analyze")
    max_pages: Optional[int] = Field(5, description="Maximum number of review pages to scrape (default 5)")

class AnalyzeResponse(BaseModel):
    job_id: Optional[str] = Field(None, description="UUID of the background job (None if cached result is returned)")
    status: str = Field(..., description="Job status (pending) or result status (completed if from cache)")
    cached_result: Optional[Dict[str, Any]] = Field(None, description="Immediate result if cache hit occurred")

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    product_url: str
    product_name: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
