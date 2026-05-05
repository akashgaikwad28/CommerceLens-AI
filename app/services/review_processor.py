"""
Review Processor — The Orchestration Engine (v3)
=================================================
The BRAIN of the review analysis pipeline.

v3 Upgrades:
    1. Split keyword signals (positive vs negative) injected into prompts
    2. Keyword normalization via NLPService stem map
    3. Chunk context (chunk index + anti-repetition instruction)
    4. Insight justification in aggregation prompt (frequency/impact-based)
    5. Keyword consistency added to confidence formula (4 components now)
    6. Enhanced cost metrics (cost_per_review, cache_saved_cost)
    7. Processing time measurement (processing_time_ms)

Pipeline:
    Raw Reviews
        ↓ NLPService.filter_reviews()
    Clean Reviews
        ↓ NLPService.analyze_sentiment()
    Sentiment Baseline
        ↓ NLPService.extract_keyword_signals()
    Split Keywords (positive + negative)
        ↓ chunk_reviews() (20 per chunk)
    Chunks
        ↓ AIService.orchestrate() per chunk (with chunk index + keywords)
    Chunk Summaries
        ↓ AIService.orchestrate() final aggregation (with justifications)
    Structured Insights
        ↓ _compute_confidence_score() (4-factor formula)
    Scored Insights
        ↓ ReviewCache.set()
    Cached Result
"""

import json
import re
import time
from collections import Counter
import asyncio
from typing import List, Dict, Tuple
from langsmith import traceable
from app.services.nlp_service import NLPService
from app.services.ai_service import AIService
from app.utils.cache import ReviewCache
from app.core.logger import get_logger
from app.core.exceptions import AIServiceException

import sentry_sdk

logger = get_logger("review_processor")

# ──────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────
CHUNK_SIZE = 20

# ──────────────────────────────────────────────────────
# Prompt Templates (v3 — Split Keywords + Chunk Context + Justifications)
# ──────────────────────────────────────────────────────

CHUNK_PROMPT_TEMPLATE = """You are a senior e-commerce product analyst working for a brand.

TASK: Analyze {review_count} customer reviews (chunk {chunk_index} of {total_chunks}) and extract actionable insights.

PRODUCT CONTEXT:
- Product: {product_name}
- Average Rating: {avg_rating}/5.0
- Positive keywords (from ★4-5 reviews): {positive_keywords}
- Negative keywords (from ★1-2 reviews): {negative_keywords}

REVIEWS:
{reviews_text}

Respond ONLY with valid JSON in this exact format:
{{
    "buying_reasons": ["reason 1", "reason 2", "reason 3"],
    "complaints": ["complaint 1", "complaint 2", "complaint 3"],
    "notable_patterns": ["pattern 1", "pattern 2"]
}}

RULES:
- Reference the actual product name "{product_name}" and specific features.
- Be SPECIFIC: "24g protein per scoop matches label" is good. "Good quality" is NOT acceptable.
- Each point must be a complete sentence a product manager can act on.
- Investigate the positive and negative keywords — they represent real customer signals.
- Do NOT repeat generic insights. Each point must add NEW information.
- Buying reasons: what CONVINCED people to purchase or repurchase.
- Complaints: what DISAPPOINTED people or caused returns.
- Patterns: behavioral trends (repeat vs first-time buyers, seasonal, etc.).
"""

AGGREGATION_PROMPT_TEMPLATE = """You are a Principal Product Strategy Consultant. Create a data-driven Market Intelligence report.

PRODUCT: {product_name}
DATA SOURCE: {chunk_count} analysis batches from {total_reviews} customer reviews
SENTIMENT: {avg_rating}/5.0 ({positive_pct}% positive, {negative_pct}% negative)
POSITIVE SIGNALS: {positive_keywords}
NEGATIVE SIGNALS: {negative_keywords}

BATCH SUMMARIES:
{summaries_text}

TASK: Synthesize all data into an interactive intelligence report. Respond ONLY with valid JSON.

FORMAT:
{{
    "tldr": {{
        "verdict": "Clear, punchy verdict (e.g., 'Category leader with pricing advantage').",
        "opportunity": "Growth pivot (e.g., 'Target fitness segment via specialized ads').",
        "risk": "Sales threat (e.g., 'Increasing reports of hinge failure')."
    }},
    "actionability": {{
        "fix_immediately": ["X% of negative reviews mention connectivity drops"],
        "improve_messaging": ["'Value for money' appears in X% of reviews -> highlight in ads"],
        "double_down": ["Strong sentiment (X%) around sound quality -> use as primary hook"]
    }},
    "market_intelligence_insights": [
        "Insight (e.g., 'Customers prioritize price-performance over brand loyalty')",
        "Insight (e.g., 'Negative sentiment spikes after 6 months of usage')"
    ],
    "keyword_insights": {{
        "positives": [
            {{"word": "keyword", "intensity": 5, "frequency_pct": 42}}
        ],
        "negatives": [
            {{"word": "keyword", "intensity": 4, "frequency_pct": 23}}
        ]
    }},
    "purchase_drivers": ["Driver with % mention or justification"],
    "pain_points": ["Pain point with % mention or justification"]
}}

RULES:
- Percentages (X%) MUST be realistic estimates based on the frequency in batch summaries.
- "market_intelligence_insights" should be high-level strategic observations.
- Each action item in "actionability" MUST be tied to a specific percentage/signal.
- Intensity is 1-5. Frequency_pct is 0-100.
"""


class ReviewProcessor:
    """
    Orchestrates the full review analysis pipeline (v3).

    v3 features:
        - Split positive/negative keyword signals
        - Chunk index context in prompts
        - Justified insights (frequency/impact-based)
        - 4-factor confidence score (+ keyword consistency)
        - Enhanced cost metrics (cost_per_review, cache_saved_cost)
        - Processing time measurement

    Usage:
        processor = ReviewProcessor()
        insights = await processor.process_reviews(reviews, product_name="Widget X")
    """

    def __init__(self):
        self.nlp = NLPService()
        self.ai = AIService()
        self.cache = ReviewCache()

    # ──────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────

    @traceable(name="Review Processing Pipeline")
    async def process_reviews(
        self,
        reviews: List[Dict],
        product_name: str = "Unknown Product",
        total_scraped: int = 0,
    ) -> Dict:
        """
        Main entry point. Processes raw reviews into structured insights.

        Args:
            reviews: List of raw review dicts from the scraper.
            product_name: Name of the product being analyzed.
            total_scraped: Total reviews scraped (before filtering).

        Returns:
            Complete insight response with sentiment, AI analysis,
            model metadata, cost estimation, processing time, and data context.
        """
        start_time = time.time()
        total_scraped = total_scraped or len(reviews)
        
        # Performance Optimization: Cap reviews at 100 for free-tier safe processing
        reviews = reviews[:100]

        logger.info(
            f"[PROCESSOR START] Product: '{product_name}' | "
            f"Raw reviews: {len(reviews)} | Scraped: {total_scraped}"
        )

        # ── Step 1: Check cache ──
        cached = self.cache.get(reviews, product_name=product_name)
        if cached:
            elapsed_ms = round((time.time() - start_time) * 1000)
            # Estimate what we would have spent if not cached
            estimated_saved = self._estimate_cache_saved_cost(len(reviews))
            logger.info(
                f"[PROCESSOR] Cache hit — returning cached insights | "
                f"Saved cost: ${estimated_saved:.6f} | Time: {elapsed_ms}ms"
            )
            cached["processing_time_ms"] = elapsed_ms
            cached["cost_metrics"] = {
                "estimated_cost_usd": 0.0,
                "cost_per_review": 0.0,
                "cache_saved_cost_usd": estimated_saved,
            }
            return cached

        # ── Step 2: Clean + filter reviews ──
        clean_reviews = self.nlp.filter_reviews(reviews)
        if not clean_reviews:
            raise AIServiceException(
                message="No usable reviews after cleaning. All reviews were too short or duplicates.",
                status_code=400,
            )

        # ── Step 3: Sentiment analysis (free, no API call) ──
        sentiment = self.nlp.analyze_sentiment(clean_reviews)

        # ── Step 4: Extract split keyword signals (v3) ──
        positive_kw, negative_kw, all_kw, keyword_consistency = (
            self.nlp.extract_keyword_signals(clean_reviews)
        )

        # ── Step 5: Chunk reviews ──
        chunks = self._chunk_reviews(clean_reviews, CHUNK_SIZE)
        total_chunks = len(chunks)
        logger.info(f"[PROCESSOR] Split into {total_chunks} chunks of ~{CHUNK_SIZE} reviews each")

        # ── Step 6: Summarize each chunk via LLM (v3: with chunk index + split keywords) ──
        chunk_summaries = await self._summarize_chunks(
            chunks, product_name, sentiment, positive_kw, negative_kw, total_chunks
        )

        if not chunk_summaries:
            elapsed_ms = round((time.time() - start_time) * 1000)
            logger.warning("[PROCESSOR] All chunk summarizations failed. Returning sentiment-only.")
            result = self._build_sentiment_only_result(sentiment, clean_reviews, total_scraped, elapsed_ms)
            self.cache.set(reviews, result, product_name=product_name)
            return result

        # ── Step 7: Aggregate chunk summaries (v3: with justifications) ──
        ai_insights = await self._aggregate_summaries(
            chunk_summaries, product_name, sentiment,
            positive_kw, negative_kw, len(clean_reviews)
        )

        # ── Step 8: Compute confidence score (v3: 4-factor with keyword consistency) ──
        confidence = self._compute_confidence_score(
            chunk_success_rate=len(chunk_summaries) / total_chunks,
            review_count=len(clean_reviews),
            sentiment=sentiment,
            keyword_consistency=keyword_consistency,
        )

        # ── Step 9: Merge everything into final response ──
        elapsed_ms = round((time.time() - start_time) * 1000)
        session_stats = self.ai.get_session_stats()
        result = self._merge_results(
            sentiment=sentiment,
            ai_insights=ai_insights,
            confidence=confidence,
            review_count=len(clean_reviews),
            total_scraped=total_scraped,
            session_stats=session_stats,
            processing_time_ms=elapsed_ms,
        )

        # ── Step 10: Cache ──
        self.cache.set(reviews, result, product_name=product_name)

        logger.info(
            f"[PROCESSOR DONE] Product: '{product_name}' | "
            f"Model: {result['model_used']['provider']} | "
            f"Confidence: {result['confidence_score']} | "
            f"Cost: ${session_stats['total_estimated_cost_usd']:.6f} | "
            f"Time: {elapsed_ms}ms | "
            f"Reviews: {result['reviews_analyzed']}/{result['total_reviews_scraped']}"
        )

        return result

    # ──────────────────────────────────────────────────────
    # Chunking
    # ──────────────────────────────────────────────────────

    def _chunk_reviews(self, reviews: List[Dict], chunk_size: int) -> List[List[Dict]]:
        """Split reviews into fixed-size chunks for batched LLM processing."""
        return [reviews[i:i + chunk_size] for i in range(0, len(reviews), chunk_size)]

    # ──────────────────────────────────────────────────────
    # Chunk Summarization (v3 — with chunk index + split keywords)
    # ──────────────────────────────────────────────────────

    @traceable(name="Chunk Summarization Loop")
    async def _summarize_chunks(
        self,
        chunks: List[List[Dict]],
        product_name: str,
        sentiment: Dict,
        positive_kw: List[str],
        negative_kw: List[str],
        total_chunks: int,
    ) -> List[str]:

        summaries: List[str] = []

        for i, chunk in enumerate(chunks):
            chunk_index = i + 1
            logger.info(f"[CHUNK {chunk_index}/{total_chunks}] Summarizing {len(chunk)} reviews...")

            reviews_text = self._format_reviews_for_prompt(chunk)

            prompt = CHUNK_PROMPT_TEMPLATE.format(
                review_count=len(chunk),
                chunk_index=chunk_index,
                total_chunks=total_chunks,
                product_name=product_name,
                avg_rating=sentiment.get("average_score", 0.0),
                positive_keywords=", ".join(positive_kw[:8]) or "N/A",
                negative_keywords=", ".join(negative_kw[:8]) or "N/A",
                reviews_text=reviews_text,
            )

            try:
                result = await asyncio.wait_for(
                    self.ai.orchestrate(prompt),
                    timeout=20  # slightly safer
                )

                content = result.get("content", "")

                parsed = self._safe_parse_chunk(content)

                if parsed:
                    summaries.append(json.dumps(parsed))
                    logger.info(f"[CHUNK {chunk_index}] Valid summary added")
                else:
                    logger.warning(f"[CHUNK {chunk_index}] Invalid JSON, skipped")

            except Exception as e:
                logger.error(f"[CHUNK {chunk_index}] Failed: {str(e)}")
                sentry_sdk.capture_exception(e)
                continue

        logger.info(f"[CHUNKS] {len(summaries)}/{total_chunks} chunks summarized successfully")
        return summaries

    # ──────────────────────────────────────────────────────
    # Final Aggregation (v3 — with justifications + split keywords)
    # ──────────────────────────────────────────────────────

    @traceable(name="Final Aggregation")
    async def _aggregate_summaries(
        self,
        summaries: List[str],
        product_name: str,
        sentiment: Dict,
        positive_kw: List[str],
        negative_kw: List[str],
        total_reviews: int,
    ) -> Dict:
        """
        Combine all chunk summaries into final insights.

        v3: Prompt now requires each insight to include a justification
        (e.g., "mentioned in 4/5 batches" or "high-impact: caused returns").
        """
        MAX_SUMMARIES = 12
        summaries = summaries[:MAX_SUMMARIES]
        summaries_text = "\n\n---\n\n".join(
            [f"Batch {i+1}:\n{s}" for i, s in enumerate(summaries)]
        )

        prompt = AGGREGATION_PROMPT_TEMPLATE.format(
            product_name=product_name,
            chunk_count=len(summaries),
            total_reviews=total_reviews,
            avg_rating=sentiment.get("average_score", 0.0),
            positive_pct=int(sentiment.get("positive_ratio", 0.0) * 100),
            negative_pct=int(sentiment.get("negative_ratio", 0.0) * 100),
            positive_keywords=", ".join(positive_kw[:8]) or "N/A",
            negative_keywords=", ".join(negative_kw[:8]) or "N/A",
            summaries_text=summaries_text,
        )

        try:
            result = await self.ai.orchestrate(prompt)
            content = result.get("content", "")
            model_used = result.get("model_used", {})

            parsed = self._parse_llm_json(content)
            parsed["model_used"] = model_used

            return parsed

        except Exception as e:
            logger.error(f"[AGGREGATION] Failed: {str(e)}")
            sentry_sdk.capture_exception(e)

            return {
                "tldr": {"verdict": "Analysis failed", "opportunity": "", "risk": ""},
                "actionability": {"fix_immediately": [], "improve_messaging": [], "double_down": []},
                "market_intelligence_insights": [],
                "purchase_drivers": [],
                "pain_points": [],
                "keyword_insights": {"positives": [], "negatives": []},
                "model_used": {"provider": "partial", "model": "none", "fallback_used": True},
            }

    # ──────────────────────────────────────────────────────
    # Computed Confidence Score (v3 — 4-factor formula)
    # ──────────────────────────────────────────────────────

    def _compute_confidence_score(
        self,
        chunk_success_rate: float,
        review_count: int,
        sentiment: Dict,
        keyword_consistency: float,
    ) -> float:
        """
        Compute confidence from DATA QUALITY, not LLM opinion.

        v3 Formula (4 weighted components):

        1. Chunk Success Rate (35% weight)
           - What % of chunks returned valid summaries?

        2. Review Volume (25% weight)
           - More reviews = more signal (caps at 100)

        3. Sentiment Clarity (20% weight)
           - Clear sentiment (mostly positive OR mostly negative) = high confidence

        4. Keyword Consistency (20% weight) — NEW
           - If reviews consistently mention the same topics, insights are more reliable.
           - Measured by: top_5_keyword_count / total_keyword_count
           - High consistency = reviews agree on what matters.
           - Low consistency = reviews are scattered, insights less reliable.

        Returns:
            Float between 0.0 and 1.0, rounded to 2 decimal places.
        """
        chunk_score = chunk_success_rate
        volume_score = min(1.0, review_count / 100.0)

        positive = sentiment.get("positive_ratio", 0.0)
        negative = sentiment.get("negative_ratio", 0.0)
        clarity_score = max(positive, negative)

        # Weighted combination (4 factors)
        confidence = (
            chunk_score * 0.35 +
            volume_score * 0.25 +
            clarity_score * 0.20 +
            keyword_consistency * 0.20
        )

        confidence = round(min(1.0, max(0.0, confidence)), 2)

        logger.info(
            f"[CONFIDENCE] Score: {confidence} "
            f"(chunks: {chunk_score:.2f}×0.35 + volume: {volume_score:.2f}×0.25 + "
            f"clarity: {clarity_score:.2f}×0.20 + keywords: {keyword_consistency:.2f}×0.20)"
        )

        return confidence

    # ──────────────────────────────────────────────────────
    # Cost Estimation
    # ──────────────────────────────────────────────────────

    def _estimate_cache_saved_cost(self, review_count: int) -> float:
        avg_tokens_per_review = 120
        total_tokens = review_count * avg_tokens_per_review

        cost = (total_tokens / 1_000_000) * 0.15  # GPT-4o-mini input cost
        return round(cost, 6)

    # ──────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────

    def _format_reviews_for_prompt(self, reviews: List[Dict]) -> str:
        """Format reviews into a readable text block for the LLM prompt."""
        # Fix: ensure reviews is a list
        if not isinstance(reviews, list):
            logger.error(f"Expected list of reviews, got {type(reviews)}")
            return ""
            
        lines = []
        for r in reviews:
            rating = r.get("rating", 0.0)
            title = r.get("title", "")
            text = r.get("text", "")
            line = f'[★{rating}] "{title}" — {text}'
            lines.append(line)
        return "\n".join(lines)

    def _parse_llm_json(self, content: str) -> Dict:
        """Parse JSON from an LLM response, handling markdown code blocks."""
        if not content:
            return self._default_insights()

        cleaned = content.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            parsed = json.loads(cleaned)
            return {
                "tldr": parsed.get("tldr", {"verdict": "", "opportunity": "", "risk": ""}),
                "actionability": parsed.get("actionability", {"fix_immediately": [], "improve_messaging": [], "double_down": []}),
                "market_intelligence_insights": parsed.get("market_intelligence_insights", []),
                "purchase_drivers": parsed.get("purchase_drivers", []),
                "pain_points": parsed.get("pain_points", []),
                "keyword_insights": parsed.get("keyword_insights", {"positives": [], "negatives": []}),
            }
        except json.JSONDecodeError as e:
            logger.warning(f"[JSON PARSE] Failed to parse LLM response: {str(e)}")
            logger.debug(f"[JSON PARSE] Raw content: {content[:200]}...")
            return self._default_insights()

    def _merge_results(
        self,
        sentiment: Dict,
        ai_insights: Dict,
        confidence: float,
        review_count: int,
        total_scraped: int,
        session_stats: Dict,
        processing_time_ms: int,
    ) -> Dict:
        """
        Merge all components into the final API response.
        Single source of truth for the response shape.
        """
        total_cost = session_stats.get("total_estimated_cost_usd", 0.0)
        cost_per_review = round(total_cost / max(1, review_count), 8)

        return {
            "sentiment_score": sentiment.get("average_score", 0.0),
            "positive_ratio": sentiment.get("positive_ratio", 0.0),
            "negative_ratio": sentiment.get("negative_ratio", 0.0),

            "tldr": ai_insights.get("tldr", {}),
            "actionability": ai_insights.get("actionability", {}),
            "market_intelligence_insights": ai_insights.get("market_intelligence_insights", []),
            "purchase_drivers": ai_insights.get("purchase_drivers", []),
            "pain_points": ai_insights.get("pain_points", []),
            "keyword_insights": ai_insights.get("keyword_insights", {}),

            "confidence_score": confidence,

            "model_used": ai_insights.get("model_used", {
                "provider": "unknown", "model": "unknown", "fallback_used": False,
            }),

            "reviews_analyzed": review_count,
            "total_reviews_scraped": total_scraped,

            "cost_metrics": {
                "estimated_cost_usd": round(total_cost, 6),
                "cost_per_review": cost_per_review,
                "cache_saved_cost_usd": 0.0,
            },

            "estimated_tokens": (
                session_stats.get("total_input_tokens", 0) +
                session_stats.get("total_output_tokens", 0)
            ),

            "processing_time_ms": processing_time_ms,
        }

    def _build_sentiment_only_result(
        self, sentiment: Dict, reviews: List[Dict], total_scraped: int, processing_time_ms: int
    ) -> Dict:
        """Build a result when AI analysis fails but sentiment is available."""
        return {
            "sentiment_score": sentiment.get("average_score", 0.0),
            "positive_ratio": sentiment.get("positive_ratio", 0.0),
            "negative_ratio": sentiment.get("negative_ratio", 0.0),
            "tldr": {"verdict": "AI analysis unavailable", "opportunity": "", "risk": ""},
            "actionability": {"fix_immediately": [], "improve_messaging": [], "double_down": []},
            "market_intelligence_insights": [],
            "purchase_drivers": [],
            "pain_points": [],
            "keyword_insights": {"positives": [], "negatives": []},
            "confidence_score": 0.2,
            "model_used": {"provider": "sentiment_only", "model": "none", "fallback_used": True},
            "reviews_analyzed": len(reviews),
            "total_reviews_scraped": total_scraped,
            "cost_metrics": {
                "estimated_cost_usd": 0.0,
                "cost_per_review": 0.0,
                "cache_saved_cost_usd": 0.0,
            },
            "estimated_tokens": 0,
            "processing_time_ms": processing_time_ms,
        }

    def _default_insights(self) -> Dict:
        """Default insight structure when JSON parsing fails."""
        return {
            "tldr": {"verdict": "", "opportunity": "", "risk": ""},
            "actionability": {"fix_immediately": [], "improve_messaging": [], "double_down": []},
            "market_intelligence_insights": [],
            "purchase_drivers": [],
            "pain_points": [],
            "keyword_insights": {"positives": [], "negatives": []},
        }

    def _safe_parse_chunk(self, content: str) -> Dict | None:
        try:
            cleaned = content.strip()

            if cleaned.startswith("```"):
                cleaned = cleaned.replace("```json", "").replace("```", "").strip()

            data = json.loads(cleaned)

            if "buying_reasons" in data and "complaints" in data:
                return data

        except Exception:
            return None

        return None