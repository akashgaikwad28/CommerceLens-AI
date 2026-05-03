from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.repository import JobRepository
from app.api.schemas import CompareRequest, CompareResponse, CompareResultResponse
from app.workers.compare_worker import process_comparison_job

router = APIRouter(prefix="/api/v1", tags=["comparison"])

@router.post("/compare", response_model=CompareResponse)
async def compare_products(
    request: CompareRequest, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    repo = JobRepository(db)
    
    # Check for existing recent comparison (cache)
    urls = [str(url) for url in request.product_urls]
    existing_job = await repo.find_similar_comparison(urls)
    
    if existing_job:
        return CompareResponse(job_id=existing_job.id, status="completed")
        
    # Create new job
    job_id = await repo.create_comparison_job(urls)
    
    # Trigger background worker
    background_tasks.add_task(process_comparison_job, job_id, urls)
    
    return CompareResponse(job_id=job_id, status="pending")

@router.get("/compare/{job_id}", response_model=CompareResultResponse)
async def get_compare_result(job_id: str, db: AsyncSession = Depends(get_db)):
    repo = JobRepository(db)
    job = await repo.get_comparison_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Comparison job not found")
        
    return CompareResultResponse(
        status=job.status,
        progress=job.progress,
        stage=job.stage,
        result=job.result,
        error=job.error
    )
