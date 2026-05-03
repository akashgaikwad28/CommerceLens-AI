"""
Cache Utility — Hash-Based Result Caching (v2)
================================================
Prevents redundant LLM calls by caching processed results.

v2 Upgrades:
    - Cache key now includes product name + review count for better specificity
    - Improved logging for cache hit/miss diagnostics
"""

import hashlib
import json
import os
import time
from typing import Optional, Dict, List
from app.core.logger import get_logger

logger = get_logger("cache")

# ──────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────
CACHE_DIR = os.path.join("data", "cache")
CACHE_TTL_SECONDS = 86400  # 24 hours


class ReviewCache:
    """
    File-based caching layer for review analysis results.

    v2: Cache key is built from product_name + review_count + text sample,
    making cache keys more specific and reducing false matches.

    Usage:
        cache = ReviewCache()
        cached = cache.get(reviews, product_name="Widget X")
        if cached:
            return cached
        # ... process ...
        cache.set(reviews, result, product_name="Widget X")
    """

    def __init__(self):
        """Ensure the cache directory exists."""
        os.makedirs(CACHE_DIR, exist_ok=True)
        logger.info(f"[CACHE] Initialized. Directory: {CACHE_DIR}")

    # ──────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────

    def get(self, reviews: List[Dict], product_name: str = "") -> Optional[Dict]:
        """
        Look up cached results for a set of reviews.

        Args:
            reviews: List of review dicts.
            product_name: Product name to include in cache key.

        Returns:
            Cached result dict if found and not expired, None otherwise.
        """
        cache_key = self._compute_hash(reviews, product_name)
        cache_path = os.path.join(CACHE_DIR, f"{cache_key}.json")

        if not os.path.exists(cache_path):
            logger.info(f"[CACHE MISS] Key: {cache_key[:12]}... | Product: '{product_name}'")
            return None

        # Check TTL
        file_age = time.time() - os.path.getmtime(cache_path)
        if file_age > CACHE_TTL_SECONDS:
            logger.info(
                f"[CACHE EXPIRED] Key: {cache_key[:12]}... | "
                f"Age: {file_age/3600:.1f}h (TTL: {CACHE_TTL_SECONDS/3600:.0f}h)"
            )
            os.remove(cache_path)
            return None

        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                cached_data = json.load(f)

            remaining_ttl = (CACHE_TTL_SECONDS - file_age) / 3600
            logger.info(
                f"[CACHE HIT] Key: {cache_key[:12]}... | "
                f"Product: '{product_name}' | TTL remaining: {remaining_ttl:.1f}h"
            )
            return cached_data

        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"[CACHE ERROR] Failed to read cache file: {str(e)}")
            return None

    def set(self, reviews: List[Dict], result: Dict, product_name: str = "") -> None:
        """
        Store a result in the cache.

        Args:
            reviews: Input reviews (used for cache key).
            result: Analysis result to cache.
            product_name: Product name to include in cache key.
        """
        cache_key = self._compute_hash(reviews, product_name)
        cache_path = os.path.join(CACHE_DIR, f"{cache_key}.json")

        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            size_kb = os.path.getsize(cache_path) / 1024
            logger.info(
                f"[CACHE STORED] Key: {cache_key[:12]}... | "
                f"Product: '{product_name}' | Size: {size_kb:.1f}KB | TTL: 24h"
            )

        except IOError as e:
            logger.warning(f"[CACHE ERROR] Failed to write cache: {str(e)}")

    def clear(self) -> int:
        """Clear all cached results. Returns number of files removed."""
        count = 0
        for filename in os.listdir(CACHE_DIR):
            if filename.endswith(".json"):
                os.remove(os.path.join(CACHE_DIR, filename))
                count += 1
        logger.info(f"[CACHE CLEARED] Removed {count} cached entries")
        return count

    # ──────────────────────────────────────────────────────
    # Private Helpers
    # ──────────────────────────────────────────────────────

    def _compute_hash(self, reviews: List[Dict], product_name: str = "") -> str:
        """
        Compute a deterministic hash for a set of reviews.

        v2 key composition:
            product_name + review_count + sorted review texts
        This ensures:
            - Same product + same reviews = cache hit
            - Same reviews but different product = cache miss (correct!)
            - Same product + 1 new review = cache miss (new data to analyze)

        Args:
            reviews: List of review dicts.
            product_name: Product name string.

        Returns:
            MD5 hex string (32 characters).
        """
        # Build composite key: product name + count + review text sample
        texts = sorted([r.get("text", "") for r in reviews])
        composite = f"{product_name.lower().strip()}|{len(reviews)}|{'|'.join(texts)}"
        return hashlib.md5(composite.encode("utf-8")).hexdigest()
