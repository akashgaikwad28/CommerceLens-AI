from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.db.repository import JobRepository
from app.db.models import AnalysisJob
from typing import List
from app.api.schemas import AnalyzeRequest, AnalyzeResponse, JobStatusResponse, JobSummaryResponse, JobMeta
from app.workers.job_worker import process_job

router = APIRouter(prefix="/api/v1", tags=["analysis"])

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_product(
    request: AnalyzeRequest, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    url_str = str(request.product_url)
    
    # Check "cache" by looking for a recently completed job with the same URL
    # (Since ReviewCache requires actual review text to build its hash)
    result = await db.execute(
        select(AnalysisJob)
        .where(AnalysisJob.product_url == url_str)
        .where(AnalysisJob.status == "completed")
        .order_by(AnalysisJob.updated_at.desc())
    )
    existing_job = result.scalars().first()
    
    if existing_job and existing_job.result:
        return AnalyzeResponse(
            job_id=existing_job.id, 
            status="completed", 
            cached_result=existing_job.result
        )

    # If not cached, create a new job
    repo = JobRepository(db)
    job_id = await repo.create_job(product_url=url_str)
    
    # Trigger background processing
    background_tasks.add_task(process_job, job_id, url_str, request.max_pages)
    
    return AnalyzeResponse(job_id=job_id, status="pending")

@router.get("/jobs", response_model=List[JobSummaryResponse])
async def get_jobs(db: AsyncSession = Depends(get_db)):
    repo = JobRepository(db)
    jobs = await repo.get_all_jobs()
    return [
        JobSummaryResponse(
            job_id=job.id,
            product_name=job.product_name,
            status=job.status,
            created_at=job.created_at
        ) for job in jobs
    ]

@router.get("/result/{job_id}", response_model=JobStatusResponse)
async def get_job_result(job_id: str, db: AsyncSession = Depends(get_db)):
    repo = JobRepository(db)
    job = await repo.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    processing_time = None
    if job.result and isinstance(job.result, dict):
        processing_time = job.result.get("processing_time_ms")
        
    return JobStatusResponse(
        job_id=job.id,
        status=job.status,
        data=job.result,
        error=job.error,
        meta=JobMeta(
            created_at=job.created_at,
            processing_time_ms=processing_time
        )
    )
