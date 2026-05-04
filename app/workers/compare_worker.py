import asyncio
import time
import json
import sentry_sdk
from typing import List
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.db.repository import JobRepository
from app.db.models import AnalysisJob
from app.workers.job_worker import process_job
from app.services.compare_service import CompareService
from app.services.ai_service import AIService
from app.core.logger import get_logger

logger = get_logger("compare_worker")

async def process_comparison_job(job_id: str, product_urls: List[str]):
    """
    Background worker to process a multi-product comparison.
    Uses non-blocking sleep loops, strict failure checks, and tracking hooks.
    """
    start_time = time.time()
    metrics = {
        "analysis_wait_time": 0,
        "ai_latency": 0,
        "total_duration": 0
    }
    
    logger.info(f"[COMPARE WORKER] Starting comparison job {job_id} for {len(product_urls)} products")
    
    async with AsyncSessionLocal() as session:
        repo = JobRepository(session)
        
        try:
            # Stage: QUEUED -> PROCESSING
            await repo.update_comparison_status(job_id, "PROCESSING")
            await repo.update_comparison_progress(job_id, 10, "Fetching product data")
            
            analysis_job_ids = []
            pending_jobs = []
            
            for url in product_urls:
                result = await session.execute(
                    select(AnalysisJob)
                    .where(AnalysisJob.product_url == url)
                    .where(AnalysisJob.status == "completed")
                    .order_by(AnalysisJob.updated_at.desc())
                )
                existing_job = result.scalars().first()
                
                if existing_job:
                    logger.info(f"[COMPARE WORKER] Found existing analysis {existing_job.id} for {url}")
                    analysis_job_ids.append(existing_job.id)
                else:
                    logger.info(f"[COMPARE WORKER] Triggering new analysis for {url}")
                    new_job_id = await repo.create_job(product_url=url)
                    analysis_job_ids.append(new_job_id)
                    pending_jobs.append(new_job_id)
                    # Trigger analysis in background (non-blocking)
                    asyncio.create_task(process_job(new_job_id, url, max_pages=3))
            
            comp_job = await repo.get_comparison_job(job_id)
            comp_job.product_job_ids = analysis_job_ids
            await session.commit()
            
            # Stage: WAITING_FOR_ANALYSIS
            await repo.update_comparison_status(job_id, "WAITING_FOR_ANALYSIS")
            await repo.update_comparison_progress(job_id, 30, "Waiting for analysis tasks")
            
            wait_start = time.time()
            if pending_jobs:
                MAX_WAIT_TIME = 90
                POLL_INTERVAL = 5
                
                while True:
                    if time.time() - wait_start > MAX_WAIT_TIME:
                        logger.warning(f"[COMPARE WORKER] Timeout ({MAX_WAIT_TIME}s) reached waiting for analysis jobs.")
                        break
                        
                    all_done = True
                    failed_jobs = []
                    for pid in pending_jobs:
                        pj = await repo.get_job(pid)
                        if pj and pj.status in ["pending", "processing"]:
                            all_done = False
                            break
                        if pj and pj.status == "failed":
                            failed_jobs.append(pid)
                            
                    if all_done:
                        if failed_jobs:
                            logger.warning(f"[COMPARE WORKER] Analysis jobs failed before comparison: {failed_jobs}")
                        break
                        
                    await asyncio.sleep(POLL_INTERVAL)
                    await session.refresh(comp_job)
            
            metrics["analysis_wait_time"] = round(time.time() - wait_start, 2)

            # Stage: COMPARING
            await repo.update_comparison_status(job_id, "COMPARING")
            await repo.update_comparison_progress(job_id, 60, "Running comparison engine")
            
            completed_jobs = []
            failed_products = []
            
            for pid in analysis_job_ids:
                pj = await repo.get_job(pid)
                if pj and pj.status == "completed" and pj.result:
                    completed_jobs.append(pj)
                else:
                    reason = "Analysis did not complete" if pj else "Job missing"
                    if pj and pj.error:
                        reason = friendly_failure_reason(pj.error)
                    failed_products.append({"url": pj.product_url if pj else "Unknown", "reason": reason})
            
            valid_products = len(completed_jobs)
            total_products = len(product_urls)
            success_ratio = valid_products / total_products if total_products > 0 else 0
            
            if valid_products < 2:
                error_msg = f"Comparison requires at least 2 valid products. Only {valid_products} completed."
                if failed_products:
                    error_msg = f"{error_msg} {failed_products[0]['reason']}."
                logger.error(f"[COMPARE WORKER] {error_msg}")
                comp_job = await repo.get_comparison_job(job_id)
                if comp_job:
                    comp_job.result = {
                        "products": [],
                        "failed_products": failed_products,
                        "observability": metrics
                    }
                    await session.commit()
                await repo.update_comparison_status(job_id, "FAILED", error_msg)
                return
                
            compare_service = CompareService()
            structured_data = compare_service.build_structured_data(completed_jobs)
            confidence = compare_service.compute_comparison_confidence(structured_data, total_products)
            
            await repo.update_comparison_progress(job_id, 90, "Generating insights")
            
            ai_start = time.time()
            ai_service = AIService()
            ai_response = await ai_service.orchestrate_comparison(structured_data)
            metrics["ai_latency"] = round(time.time() - ai_start, 2)
            
            try:
                content = ai_response.get("content", "{}")
                if content.startswith("```json"): content = content[7:]
                if content.startswith("```"): content = content[3:]
                if content.endswith("```"): content = content[:-3]
                ai_insights = json.loads(content.strip())
            except Exception as e:
                logger.error(f"[COMPARE WORKER] Failed to parse AI JSON: {str(e)}")
                ai_insights = {
                    "winner": "Unknown",
                    "reason": "Failed to parse AI output",
                    "product_rankings": [],
                    "best_for": {},
                    "tradeoffs": [],
                    "decision_recommendation": "Manual review needed",
                    "confidence_score": 0.0
                }
            
            metrics["total_duration"] = round(time.time() - start_time, 2)
            
            final_result = {
                "products": structured_data["products"],
                "comparison_metrics": structured_data["comparison_metrics"],
                "winner": ai_insights.get("winner", ""),
                "reason": ai_insights.get("reason", ""),
                "product_rankings": ai_insights.get("product_rankings", []),
                "best_for": ai_insights.get("best_for", {}),
                "tradeoffs": ai_insights.get("tradeoffs", []),
                "decision_recommendation": ai_insights.get("decision_recommendation", ""),
                "confidence_score": confidence,
                "failed_products": failed_products,
                "observability": metrics
            }
            
            # Stage: COMPLETED
            await repo.update_comparison_status(job_id, "COMPLETED")
            await repo.save_comparison_result(job_id, final_result)
            logger.info(f"[COMPARE WORKER] Job {job_id} completed successfully in {metrics['total_duration']}s")
            
        except Exception as e:
            logger.error(f"[COMPARE WORKER] Job {job_id} failed with exception: {str(e)}")
            sentry_sdk.capture_exception(e)
            await repo.update_comparison_status(job_id, "FAILED", str(e))


def friendly_failure_reason(reason: str) -> str:
    if reason == "NO_REVIEWS":
        return "No review data could be extracted for this product"
    return reason or "Analysis failed"
