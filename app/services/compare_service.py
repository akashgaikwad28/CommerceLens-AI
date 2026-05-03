from typing import List, Dict, Any
from collections import defaultdict
from app.db.models import AnalysisJob
from app.core.logger import get_logger

logger = get_logger("compare_service")

class CompareService:
    def __init__(self):
        pass

    def build_structured_data(self, completed_jobs: List[AnalysisJob]) -> Dict[str, Any]:
        """
        Extract and format STRICT structured data from individual product analysis jobs.
        Raw text is not passed. Only top signals and computed matrices.
        """
        products = []
        all_keywords = []

        for job in completed_jobs:
            if not job.result:
                continue

            res = job.result
            
            # Keep top 3 pros/cons only to keep prompt tight
            top_pros = res.get("top_buying_reasons", [])[:3]
            top_cons = res.get("top_complaints", [])[:3]
            
            # Simple keyword overlap tracking
            words = set(" ".join(top_pros + top_cons).lower().split())
            all_keywords.append(words)

            products.append({
                "url": job.product_url,
                "name": job.product_name or job.product_url,
                "rating": float(res.get("sentiment_score", 0.0)),
                "sentiment_score": float(res.get("positive_ratio", 0.0)),
                "top_pros": top_pros,
                "top_cons": top_cons,
                "review_count": int(res.get("reviews_analyzed", 0)),
                "confidence_score": float(res.get("confidence_score", 0.0))
            })

        if not products:
            return {"products": [], "comparison_metrics": {}}

        # Compute deterministic differences (booleans/floats only)
        highest_rating = max((p["rating"] for p in products), default=0)
        lowest_rating = min((p["rating"] for p in products), default=0)
        highest_sentiment = max((p["sentiment_score"] for p in products), default=0)
        lowest_sentiment = min((p["sentiment_score"] for p in products), default=0)

        rating_gap = highest_rating - lowest_rating
        sentiment_delta = highest_sentiment - lowest_sentiment

        common_keywords = set.intersection(*all_keywords) if all_keywords else set()
        common_keywords = {w for w in common_keywords if len(w) > 4}

        return {
            "products": products,
            "comparison_metrics": {
                "rating_gap_matrix": rating_gap >= 0.3, # True if significant difference
                "sentiment_delta": sentiment_delta >= 0.15, # True if clear winner
                "keyword_overlap": len(common_keywords) > 0 # True if products share features
            }
        }

    def compute_comparison_confidence(self, structured_data: Dict[str, Any], total_urls: int) -> float:
        """
        Calculate overall confidence of the comparison based on:
        1. Average confidence of individual products
        2. Ratio of valid products successfully analyzed
        """
        products = structured_data.get("products", [])
        valid_products = len(products)
        if valid_products == 0:
            return 0.0

        avg_confidence = sum(p["confidence_score"] for p in products) / valid_products
        valid_ratio = valid_products / total_urls

        confidence = avg_confidence * valid_ratio
        return round(min(1.0, max(0.0, confidence)), 2)
