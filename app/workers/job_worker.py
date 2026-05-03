import asyncio
import sentry_sdk
from app.db.session import AsyncSessionLocal
from app.db.repository import JobRepository
from app.services.scraper_service import AmazonScraperService
from app.services.review_processor import ReviewProcessor
from app.core.logger import get_logger

logger = get_logger("job_worker")

async def process_job(job_id: str, product_url: str, max_pages: int = 5):
    """
    Background worker to process an Amazon URL.
    1. Update status to processing
    2. Scrape reviews
    3. Process with AI
    4. Save to DB
    """
    logger.info(f"[WORKER] Starting job {job_id} for {product_url}")
    
    # We create a new DB session for the background task
    async with AsyncSessionLocal() as session:
        repo = JobRepository(session)
        
        try:
            # 1. Mark as processing
            await repo.update_status(job_id, "processing")
            
            # 2. Scrape reviews
            scraper = AmazonScraperService()
            scrape_result = await scraper.fetch_reviews(product_url, max_pages=max_pages)
            
            reviews = scrape_result.get("reviews", [])
            product_name = scrape_result.get("product_name", "Unknown Product")
            
            if not reviews:
                raise ValueError("Scraper returned 0 reviews.")
                
            # 3. Process reviews
            processor = ReviewProcessor()
            ai_result = await processor.process_reviews(
                reviews=reviews,
                product_name=product_name,
                total_scraped=scrape_result.get("total_reviews", len(reviews))
            )
            
            # 4. Save result
            await repo.save_result(job_id, ai_result, product_name)
            logger.info(f"[WORKER] Job {job_id} completed successfully.")
            
        except Exception as e:
            logger.error(f"[WORKER] Job {job_id} failed: {str(e)}")
            sentry_sdk.capture_exception(e)
            
            # Attempt to save error state to DB
            try:
                await repo.save_error(job_id, str(e))
            except Exception as db_e:
                logger.error(f"[WORKER] Failed to save error state for {job_id}: {str(db_e)}")
