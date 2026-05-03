from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models import AnalysisJob
from app.core.logger import get_logger

logger = get_logger("repository")

class JobRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_job(self, product_url: str) -> str:
        """Create a new job in 'pending' state and return its UUID."""
        job = AnalysisJob(product_url=product_url, status="pending")
        self.session.add(job)
        await self.session.commit()
        await self.session.refresh(job)
        logger.info(f"[DB] Created job {job.id} for {product_url}")
        return job.id

    async def get_job(self, job_id: str) -> Optional[AnalysisJob]:
        """Retrieve a job by its UUID."""
        result = await self.session.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
        return result.scalars().first()

    async def get_all_jobs(self) -> List[AnalysisJob]:
        """Retrieve all jobs ordered by creation time descending."""
        result = await self.session.execute(select(AnalysisJob).order_by(AnalysisJob.created_at.desc()))
        return list(result.scalars().all())

    async def update_status(self, job_id: str, status: str) -> None:
        """Update the status of an existing job."""
        job = await self.get_job(job_id)
        if job:
            job.status = status
            await self.session.commit()
            logger.info(f"[DB] Job {job_id} status updated to '{status}'")

    async def save_result(self, job_id: str, result_json: dict, product_name: str) -> None:
        """Save the successful analysis result and update status to 'completed'."""
        job = await self.get_job(job_id)
        if job:
            job.status = "completed"
            job.result = result_json
            job.product_name = product_name
            await self.session.commit()
            logger.info(f"[DB] Job {job_id} completed and result saved.")

    async def save_error(self, job_id: str, error_msg: str) -> None:
        """Save the error message and update status to 'failed'."""
        job = await self.get_job(job_id)
        if job:
            job.status = "failed"
            job.error = error_msg
            await self.session.commit()
            logger.error(f"[DB] Job {job_id} failed: {error_msg}")
