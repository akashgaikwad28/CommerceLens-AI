"""
Amazon Mobile API Fetcher
=========================
Tries Amazon's internal API endpoints used by the mobile app.
These are often less strictly gated than the browser /product-reviews/ page.

Endpoint priority:
1. /reviews/ajax/getreviews  (mobile ajax endpoint)
2. /product-reviews/{asin}   via mobile user-agent
"""

import httpx
import re
import json
from typing import List, Dict, Optional, Tuple
from app.core.logger import get_logger

logger = get_logger("api_fetcher")

MOBILE_USER_AGENT = (
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.6778.135 Mobile Safari/537.36"
)

MOBILE_HEADERS = {
    "User-Agent": MOBILE_USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

REVIEW_BODY_PATTERN   = re.compile(r'data-hook="review-body"[^>]*>\s*<span[^>]*>(.*?)</span>', re.DOTALL)
REVIEW_TITLE_PATTERN  = re.compile(r'data-hook="review-title"[^>]*>.*?<span[^>]*>(.*?)</span>', re.DOTALL)
REVIEW_RATING_PATTERN = re.compile(r'data-hook="review-star-rating"[^>]*>.*?(\d+\.?\d*) out of', re.DOTALL)


class AmazonAPIFetcher:
    """
    Lightweight httpx-based fetcher. No browser, no Playwright.
    Uses mobile endpoints and headers to bypass the sign-in gate.
    """

    def __init__(self, proxy_url: Optional[str] = None):
        self._proxy_url = proxy_url

    def _make_client(self) -> httpx.AsyncClient:
        kwargs = {
            "headers": MOBILE_HEADERS,
            "timeout": 20.0,
            "follow_redirects": True,
        }
        if self._proxy_url:
            kwargs["proxy"] = self._proxy_url
        return httpx.AsyncClient(**kwargs)

    async def fetch_reviews(
        self, asin: str, domain: str, max_pages: int = 5
    ) -> Tuple[bool, List[Dict]]:
        """
        Returns (success: bool, reviews: List[Dict])
        """
        async with self._make_client() as client:

            # Try endpoint 1: Ajax reviews API
            success, reviews = await self._try_ajax_endpoint(client, asin, domain, max_pages)
            if success and reviews:
                logger.info(f"[API_FETCHER] Ajax endpoint succeeded: {len(reviews)} reviews")
                return True, reviews

            # Try endpoint 2: Mobile HTML reviews page
            success, reviews = await self._try_mobile_html(client, asin, domain, max_pages)
            if success and reviews:
                logger.info(f"[API_FETCHER] Mobile HTML endpoint succeeded: {len(reviews)} reviews")
                return True, reviews

        logger.warning("[API_FETCHER] All API endpoints failed")
        return False, []

    async def _try_ajax_endpoint(
        self, client: httpx.AsyncClient, asin: str, domain: str, max_pages: int
    ) -> Tuple[bool, List[Dict]]:
        all_reviews = []
        for page in range(1, max_pages + 1):
            url = (
                f"{domain}/reviews/ajax/getreviews"
                f"?asin={asin}&pageNumber={page}&reviewerType=all_reviews"
            )
            try:
                resp = await client.get(url)
                if resp.status_code == 200 and "signin" not in str(resp.url).lower():
                    reviews = self._parse_html_reviews(resp.text)
                    if not reviews:
                        break
                    all_reviews.extend(reviews)
                else:
                    logger.warning(f"[API_FETCHER] Ajax page {page} blocked/redirected")
                    return False, []
            except Exception as e:
                logger.warning(f"[API_FETCHER] Ajax endpoint error: {e}")
                return False, []
        return bool(all_reviews), all_reviews

    async def _try_mobile_html(
        self, client: httpx.AsyncClient, asin: str, domain: str, max_pages: int
    ) -> Tuple[bool, List[Dict]]:
        all_reviews = []
        for page in range(1, max_pages + 1):
            url = (
                f"{domain}/product-reviews/{asin}/"
                f"?reviewerType=all_reviews&pageNumber={page}"
            )
            try:
                resp = await client.get(url)
                if resp.status_code == 200 and "signin" not in str(resp.url).lower():
                    reviews = self._parse_html_reviews(resp.text)
                    if not reviews:
                        break
                    all_reviews.extend(reviews)
                else:
                    logger.warning(f"[API_FETCHER] Mobile HTML page {page} blocked/redirected")
                    return False, []
            except Exception as e:
                logger.warning(f"[API_FETCHER] Mobile HTML error: {e}")
                return False, []
        return bool(all_reviews), all_reviews

    def _parse_html_reviews(self, html: str) -> List[Dict]:
        bodies   = REVIEW_BODY_PATTERN.findall(html)
        titles   = REVIEW_TITLE_PATTERN.findall(html)
        ratings  = REVIEW_RATING_PATTERN.findall(html)

        reviews = []
        for i, body in enumerate(bodies):
            clean_body = re.sub(r'<[^>]+>', '', body).strip()
            if len(clean_body) < 20:
                continue
            reviews.append({
                "title":  re.sub(r'<[^>]+>', '', titles[i]).strip() if i < len(titles) else "",
                "text":   clean_body,
                "rating": float(ratings[i]) if i < len(ratings) else 0.0,
            })
        return reviews