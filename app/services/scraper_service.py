"""
Amazon Hybrid Scraper Service (v7 — Fast HTTP + Stealth Fallback)
================================================================
Features:
- Strategy A: High-speed HTTPX fetching (Bypasses browser overhead)
- Strategy B: Stealth Playwright fallback (Simulates human behavior)
- No-Proxy logic (Optimized for local/free environments)
- Integrated Exponential Backoff
"""

import asyncio
import hashlib
import random
import re
from typing import List, Dict, Optional, Tuple, Set

import httpx
from playwright.async_api import async_playwright
import playwright_stealth
import serpapi

from app.core.config import settings
from app.core.logger import get_logger
from app.core.exceptions import ScraperException, BlockedException
from app.utils.retry import async_retry
from app.utils.browser_fingerprint import get_random_browser_config
from app.utils.human_behavior import simulate_human

logger = get_logger("scraper")

# ──────────────────────────────────────────────────────
# Configuration & Selectors
# ──────────────────────────────────────────────────────
NAVIGATION_TIMEOUT = 30000
HTTP_TIMEOUT = 15.0

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
]

MIN_REVIEW_WARNING_THRESHOLD = 100

class AmazonScraperService:
    def __init__(self):
        self._seen_reviews: Set[str] = set()

    @async_retry(max_retries=2, delay=3.0, backoff_factor=2.0)
    async def scrape_product_reviews(self, url: str, max_pages: int = 3) -> dict:
        """Main entry point: Tries HTTP first, then falls back to Playwright."""
        self._seen_reviews.clear()
        asin, domain = self._extract_asin_and_domain(url)
        
        # ── Strategy 1: Fast HTTP Path ────────────────────────
        try:
            logger.info(f"[SCRAPER] Attempting Fast HTTP path for ASIN: {asin}")
            result = await self._scrape_via_http(asin, domain, max_pages)
            if result and result.get("reviews"):
                logger.info(f"[SCRAPER] HTTP Success! Found {len(result['reviews'])} reviews.")
                return self._with_confidence_flags(result)
        except BlockedException:
            logger.warning("[SCRAPER] HTTP path blocked by Sign-in wall. Falling back to Playwright.")
        except Exception as e:
            logger.warning(f"[SCRAPER] HTTP path failed: {e}. Falling back to Playwright.")

        # ── Strategy 2: Stealth Playwright Path ───────────────
        # Skip Playwright in production if disabled (common for free-tier hosting)
        if settings.ENVIRONMENT == "production" and settings.DISABLE_PLAYWRIGHT_IN_PROD:
            logger.info("[SCRAPER] Skipping Playwright (Disabled in Production). Escalating to SerpApi.")
        else:
            try:
                logger.info(f"[SCRAPER] Attempting Stealth Playwright path for ASIN: {asin}")
                result = await self._scrape_via_playwright(asin, domain, max_pages)
                if result and result.get("reviews"):
                    logger.info(f"[SCRAPER] Playwright Success! Found {len(result['reviews'])} reviews.")
                    return self._with_confidence_flags(result)
            except Exception as e:
                logger.warning(f"[SCRAPER] Playwright path failed: {e}. Escalating to SerpApi.")

        # ── Strategy 3: SerpApi (Reliable Structured Data) ────
        logger.info(f"[SCRAPER] Attempting SerpApi path for ASIN: {asin}")
        return self._with_confidence_flags(await self._scrape_via_serpapi(asin, domain))

    # ──────────────────────────────────────────────────────
    # Strategy A: HTTPX (Fast)
    # ──────────────────────────────────────────────────────

    async def _scrape_via_http(self, asin: str, domain: str, max_pages: int) -> Optional[dict]:
        reviews_url = f"{domain}/product-reviews/{asin}/?reviewerType=all_reviews&pageNumber=1"
        
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        }

        async with httpx.AsyncClient(headers=headers, timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(reviews_url)
            
            if resp.status_code == 404:
                raise ScraperException("Product not found (404)", 404)
            
            html = resp.text.lower()
            if "signin" in html or "captcha" in html or "robot" in html:
                raise BlockedException("HTTP Blocked by Sign-in/Captcha")

            # Basic parser for HTTP response
            reviews = self._parse_html_manually(resp.text)
            if not reviews:
                return None

            return {
                "reviews": reviews,
                "product_name": "Amazon Product",  # Simple for HTTP path
                "status": "SUCCESS",
                "method": "http_fast"
            }

    # ──────────────────────────────────────────────────────
    # Strategy B: Playwright (Resilient)
    # ──────────────────────────────────────────────────────

    async def _scrape_via_playwright(self, asin: str, domain: str, max_pages: int) -> dict:
        async with async_playwright() as p:
            # Launch headful for better stealth as per user request
            browser = await p.chromium.launch(headless=False)
            
            config = get_random_browser_config()
            context = await browser.new_context(**config)
            page = await context.new_page()
            playwright_stealth.stealth(page)

            try:
                # 1. Warm session on homepage
                logger.info(f"[SCRAPER] Warming session on {domain}")
                await page.goto(domain, wait_until="domcontentloaded", timeout=NAVIGATION_TIMEOUT)
                await asyncio.sleep(random.uniform(2, 4))

                # 2. Go to product reviews (via search behavior simulation)
                product_url = f"{domain}/dp/{asin}"
                logger.info(f"[SCRAPER] Navigating to product: {product_url}")
                await page.goto(product_url, wait_until="domcontentloaded", timeout=NAVIGATION_TIMEOUT)
                await simulate_human(page)

                # 3. Click reviews
                logger.info("[SCRAPER] Searching for reviews link...")
                await self._click_reviews_link(page)
                await page.wait_for_load_state("domcontentloaded")
                
                await self._assert_not_blocked(page)

                # 4. Scrape content
                content = await page.content()
                reviews = self._parse_html_manually(content)

                if not reviews:
                    raise ScraperException("No reviews found on page", 404)

                return {
                    "reviews": reviews,
                    "product_name": await self._get_title(page),
                    "status": "SUCCESS",
                    "method": "playwright_stealth"
                }

            finally:
                await browser.close()

    # ──────────────────────────────────────────────────────
    # Strategy C: SerpApi (High Reliability & Rich Data)
    # ──────────────────────────────────────────────────────

    async def _scrape_via_serpapi(self, asin: str, domain: str) -> dict:
        if not settings.SERPAPI_KEY:
            raise ScraperException("SerpApi key not configured", 500)

        # SerpApi client is synchronous, so we run it in a thread pool to avoid blocking the event loop
        loop = asyncio.get_running_loop()
        
        def _fetch():
            client = serpapi.Client(api_key=settings.SERPAPI_KEY)
            # Normalize domain from https://www.amazon.in to amazon.in
            amazon_domain = domain.replace("https://www.", "").replace("http://www.", "").replace("https://", "").replace("http://", "")
            return client.search({
                "engine": "amazon_product",
                "asin": asin,
                "amazon_domain": amazon_domain,
                "device": "mobile",
                "no_cache": True,
            })

        try:
            results = await loop.run_in_executor(None, _fetch)
            
            if "error" in results:
                raise ScraperException(f"SerpApi Error: {results['error']}", 500)

            product = results.get("product_results", {})
            product_name = product.get("title", "Amazon Product")
            
            rev_info = results.get("reviews_information", {})
            insights = rev_info.get("summary", {}).get("insights", [])

            logger.info(
                "[SCRAPER] SerpApi review containers: "
                f"top_level_authors={len(results.get('authors_reviews', []) or [])}, "
                f"nested_authors={len(rev_info.get('authors_reviews', []) or [])}, "
                f"other_countries={len(rev_info.get('other_countries_reviews', []) or [])}, "
                f"insights={len(insights or [])}"
            )

            # Prefer the documented nested reviews_information.authors_reviews path first.
            raw_reviews = rev_info.get("authors_reviews", []) or []
            if not raw_reviews:
                raw_reviews = results.get("authors_reviews", []) or []
            if not raw_reviews:
                raw_reviews = results.get("reviews", []) or []
            if not raw_reviews:
                raw_reviews = rev_info.get("other_countries_reviews", []) or rev_info.get("reviews", []) or []

            reviews = []
            for r in raw_reviews:
                text = r.get("text") or r.get("body") or ""
                if text:
                    reviews.append({
                        "title": r.get("title", "Review"),
                        "text": text,
                        "rating": r.get("rating", 5.0)
                    })

            # If SerpApi only gives structured insights, convert examples into readable review snippets.
            if not reviews and insights:
                for insight in insights:
                    for example in insight.get("examples", []) or []:
                        snippet = (example.get("snippet") or "").strip()
                        if snippet:
                            reviews.append({
                                "title": insight.get("title", "Review insight"),
                                "text": snippet,
                                "rating": self._estimate_rating_from_sentiment(insight.get("sentiment")),
                            })
            logger.info(f"[SCRAPER] SerpApi reviews fetched: {len(reviews)}")

            # Extract pros/cons
            pros = list({i.get("title") for i in insights if i.get("sentiment") == "positive" and i.get("title")})
            cons = list({i.get("title") for i in insights if i.get("sentiment") in ["negative", "mixed"] and i.get("title")})
            summary = rev_info.get("summary", {}).get("text", "")

            # Extract specs
            specs = []
            if "product_details" in results:
                for k, v in results["product_details"].items():
                    if isinstance(v, str) and len(v) < 100:
                        specs.append(f"{k}: {v}")

            # Get total review count
            specs_raw = results.get("product_details", {})
            _, total_review_count = self._extract_rating_and_count(specs_raw.get("customer_reviews"))
            total_review_count = total_review_count or self._extract_review_count_from_summary(rev_info) or len(reviews)
            if total_review_count < MIN_REVIEW_WARNING_THRESHOLD:
                logger.warning(
                    f"[SCRAPER] Insufficient SerpApi data, flagging low confidence. "
                    f"review_count={total_review_count}, fetched={len(reviews)}"
                )

            # Get price
            price = specs_raw.get("price", 0.0)
            if not price and "price" in product:
                price = product.get("price", 0.0)

            return {
                "reviews": reviews,
                "product_name": product_name,
                "status": "SUCCESS",
                "method": "serpapi",
                "pros": pros,
                "cons": cons,
                "insights": insights,
                "summary": summary,
                "review_count": total_review_count,
                "total_reviews": total_review_count,
                "price": price,
                "specs": specs[:5],
                "image": product.get("image"),
                "reviews_information": rev_info,
            }

        except Exception as e:
            logger.error(f"[SCRAPER] SerpApi failed: {e}")
            raise ScraperException(f"SerpApi failed: {e}", 500)

    # ──────────────────────────────────────────────────────
    # Helpers & Parsers
    # ──────────────────────────────────────────────────────

    def _extract_rating_and_count(self, text: str) -> Tuple[Optional[float], Optional[int]]:
        if not text:
            return None, None
        rating_match = re.search(r"(\d+(\.\d+)?)", text)
        count_match = re.search(r"([\d,]+)\s*Reviews", text, re.IGNORECASE)
        rating = float(rating_match.group(1)) if rating_match else None
        count = int(count_match.group(1).replace(",", "")) if count_match else None
        return rating, count

    async def _click_reviews_link(self, page):
        for sel in ['a[data-hook="see-all-reviews-link-foot"]', 'a:has-text("See all reviews")']:
            try:
                link = await page.query_selector(sel)
                if link:
                    await link.scroll_into_view_if_needed()
                    await link.click()
                    return True
            except Exception:
                continue
        # Fallback to direct reviews URL if click fails
        return False

    async def _assert_not_blocked(self, page):
        url = page.url.lower()
        if "signin" in url or "captcha" in url:
            raise BlockedException("SCRAPER_BLOCKED")

    async def _get_title(self, page) -> str:
        try:
            el = await page.query_selector("#productTitle")
            return (await el.inner_text()).strip() if el else "Amazon Product"
        except Exception:
            return "Amazon Product"

    def _parse_html_manually(self, html: str) -> List[Dict]:
        """Simple regex-based or manual parser for reviews (Fast)."""
        reviews = []
        # Find all review blocks using data-hook="review"
        # In a real app, use BeautifulSoup, but keeping it light for this hybrid example
        # For now, we'll use a simplified version of the previous logic
        # (This is just a placeholder - real logic would be more robust)
        
        # Finding review bodies (data-hook="review-body")
        bodies = re.findall(r'<span data-hook="review-body"[^>]*>(.*?)</span>', html, re.DOTALL)
        titles = re.findall(r'<a data-hook="review-title"[^>]*>(.*?)</a>', html, re.DOTALL)
        
        for i in range(min(len(bodies), len(titles))):
            text = re.sub(r'<[^>]+>', '', bodies[i]).strip()
            title = re.sub(r'<[^>]+>', '', titles[i]).strip()
            
            if len(text) > 10:
                h = hashlib.md5(text.encode()).hexdigest()
                if h not in self._seen_reviews:
                    self._seen_reviews.add(h)
                    reviews.append({
                        "title": title,
                        "text": text,
                        "rating": 5.0 # Simplified
                    })
        return reviews

    def _estimate_rating_from_sentiment(self, sentiment: Optional[str]) -> float:
        mapping = {
            "positive": 5.0,
            "mixed": 3.0,
            "negative": 1.0,
        }
        return mapping.get((sentiment or "").lower(), 4.0)

    def _extract_review_count_from_summary(self, reviews_information: dict) -> int:
        summary = reviews_information.get("summary", {}) if isinstance(reviews_information, dict) else {}
        customer_reviews = summary.get("customer_reviews", {})
        if isinstance(customer_reviews, dict):
            total = 0
            for value in customer_reviews.values():
                try:
                    total += int(str(value).replace(",", "").strip())
                except (TypeError, ValueError):
                    continue
            if total:
                return total

        for review in reviews_information.get("authors_reviews", []) or []:
            reviews_count = review.get("reviews_count")
            if reviews_count:
                try:
                    return int(str(reviews_count).replace(",", "").strip())
                except ValueError:
                    continue

        return 0

    def _with_confidence_flags(self, result: dict) -> dict:
        reviews = result.get("reviews") or []
        total_reviews = result.get("review_count") or result.get("total_reviews") or len(reviews)
        result["review_count"] = total_reviews
        result["total_reviews"] = total_reviews
        result["confidence"] = round(min(1.0, len(reviews) / 1000.0), 2)

        logger.info(
            f"[SCRAPER] Method={result.get('method', 'unknown')} | "
            f"reviews_fetched={len(reviews)} | total_reviews={total_reviews} | "
            f"confidence={result['confidence']}"
        )
        if len(reviews) < MIN_REVIEW_WARNING_THRESHOLD:
            logger.warning("Low review count from scraper")

        return result

    def _extract_asin_and_domain(self, url: str) -> Tuple[str, str]:
        # Standard path-based match
        asin_match = re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})', url)
        
        # Fallback 1: Query parameter 'k' or 'pd_rd_i'
        if not asin_match:
            asin_match = re.search(r'[?&](?:k|pd_rd_i)=([A-Z0-9]{10})', url)
            
        # Fallback 2: Any 10-char alphanumeric sequence that looks like an ASIN in the path or query
        if not asin_match:
            # Avoid matching common words, look for typical ASIN patterns (start with B0)
            asin_match = re.search(r'\b(B0[A-Z0-9]{8})\b', url)

        domain_match = re.search(r'(https?://[^/]+)', url)
        
        if not asin_match or not domain_match:
            logger.error(f"[SCRAPER] Failed to extract ASIN/Domain from: {url}")
            raise ScraperException("Invalid Amazon URL. Please provide a direct product link (e.g., amazon.com/dp/ASIN).", 400)
            
        return asin_match.group(1), domain_match.group(1)
