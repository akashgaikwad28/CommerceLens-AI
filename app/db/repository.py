from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models import AnalysisJob, ComparisonJob
import json
import hashlib
from urllib.parse import urlparse, urlunparse
from datetime import datetime, timezone, timedelta
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
        result = await self.session.execute(
            select(AnalysisJob)
            .where(AnalysisJob.id == job_id)
            .execution_options(populate_existing=True)
        )
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

    # --- Comparison Job Methods ---

    def _normalize_and_hash_urls(self, product_urls: List[str]) -> tuple[List[str], str]:
        """Normalize URLs (remove query params, lowercase domain, strip trailing slash) and compute hash."""
        normalized = []
        for url in product_urls:
            try:
                parsed = urlparse(url)
                # Lowercase domain, keep path, drop params/query/fragments
                netloc = parsed.netloc.lower()
                path = parsed.path.rstrip('/')
                clean_url = f"{parsed.scheme}://{netloc}{path}"
                normalized.append(clean_url)
            except Exception:
                normalized.append(url)
                
        sorted_urls = sorted(normalized)
        key_string = "|".join(sorted_urls)
        comp_hash = hashlib.md5(key_string.encode('utf-8')).hexdigest()
        return sorted_urls, comp_hash

    async def create_comparison_job(self, product_urls: List[str]) -> str:
        """Create a new comparison job and return its UUID."""
        sorted_urls, comp_hash = self._normalize_and_hash_urls(product_urls)
        job = ComparisonJob(
            comparison_key=comp_hash,
            product_urls=sorted_urls, 
            status="pending",
            progress=0,
            stage="Initialized"
        )
        self.session.add(job)
        await self.session.commit()
        await self.session.refresh(job)
        logger.info(f"[DB] Created comparison job {job.id} for {len(sorted_urls)} products with key {comp_hash}")
        return job.id

    async def get_comparison_job(self, job_id: str) -> Optional[ComparisonJob]:
        """Retrieve a comparison job by its UUID."""
        result = await self.session.execute(select(ComparisonJob).where(ComparisonJob.id == job_id))
        return result.scalars().first()

    async def update_comparison_status(self, job_id: str, status: str, error_msg: Optional[str] = None) -> None:
        """Update the status (and optionally error) of a comparison job."""
        job = await self.get_comparison_job(job_id)
        if job:
            job.status = status
            if error_msg:
                job.error = error_msg
            if status.upper() == "FAILED":
                job.progress = 100
                job.stage = "Failed"
            await self.session.commit()
            logger.info(f"[DB] Comparison Job {job_id} status updated to '{status}'")

    async def update_comparison_progress(self, job_id: str, progress: int, stage: str) -> None:
        """Update progress and stage of a comparison job."""
        job = await self.get_comparison_job(job_id)
        if job:
            job.progress = progress
            job.stage = stage
            await self.session.commit()
            logger.info(f"[DB] Comparison Job {job_id} progress: {progress}% - {stage}")

    async def save_comparison_result(self, job_id: str, result_json: dict) -> None:
        """Save the successful comparison result."""
        job = await self.get_comparison_job(job_id)
        if job:
            job.status = "completed"
            job.progress = 100
            job.stage = "Completed"
            job.result = result_json
            await self.session.commit()
            logger.info(f"[DB] Comparison Job {job_id} completed and result saved.")

    async def find_similar_comparison(self, product_urls: List[str]) -> Optional[ComparisonJob]:
        """Find a completed comparison job for the exact same products within the last 24h using comparison_key."""
        _, comp_hash = self._normalize_and_hash_urls(product_urls)
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
        
        result = await self.session.execute(
            select(ComparisonJob)
            .where(ComparisonJob.comparison_key == comp_hash)
            .where(ComparisonJob.status == "completed")
            .where(ComparisonJob.created_at >= cutoff_time)
            .order_by(ComparisonJob.created_at.desc())
        )
        return result.scalars().first()
