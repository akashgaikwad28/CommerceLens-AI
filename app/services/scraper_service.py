"""
Amazon Review Scraper Service (v3 — Production Ready)
====================================================
Upgrades:
- Fixed Playwright lifecycle (no memory leaks)
- Concurrency control via semaphore
- CAPTCHA / bot detection
- Safer pagination (no dependency on next button)
- Better error classification
"""

from typing import List, Dict, Optional, Set, Tuple
from playwright.async_api import async_playwright, Page, Browser, BrowserContext, Playwright
from app.core.logger import get_logger
from app.core.exceptions import ScraperException
from app.utils.retry import retry

import asyncio
import hashlib
import random
import re
import sentry_sdk

logger = get_logger("scraper")

# ──────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────
DEFAULT_MAX_PAGES = 5
NAVIGATION_TIMEOUT = 30000
SELECTOR_TIMEOUT = 10000
MIN_REVIEW_LENGTH = 20

PRODUCT_TITLE_SELECTOR = '#productTitle'

REVIEW_CONTAINER_SELECTORS = [
    '[data-hook="review"]',
    '.review',
    '.a-section.review',
]

REVIEW_TITLE_SELECTORS = [
    '[data-hook="review-title"]',
    '.review-title',
    '.a-text-bold span',
]

REVIEW_BODY_SELECTORS = [
    '[data-hook="review-body"]',
    '.review-text',
    '.review-text-content',
]

REVIEW_RATING_SELECTORS = [
    '[data-hook="review-star-rating"]',
    '.review-rating',
    '[data-hook="cmps-review-star-rating"]',
]

BROWSER_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
]

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


class AmazonScraperService:

    def __init__(self):
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._seen_reviews: Set[str] = set()

        # 🚀 concurrency control (IMPORTANT for SaaS)
        self._semaphore = asyncio.Semaphore(3)

    # ──────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────

    @retry(max_retries=2, delay=3.0)
    async def fetch_reviews(self, product_url: str, max_pages: int = DEFAULT_MAX_PAGES) -> dict:

        async with self._semaphore:
            return await self._fetch_internal(product_url, max_pages)

    async def _fetch_internal(self, product_url: str, max_pages: int) -> dict:

        logger.info(f"[SCRAPER START] {product_url}")

        self._seen_reviews.clear()

        try:
            await self._launch_browser()
            page = await self._context.new_page()

            product_name = await self._get_product_title(page, product_url)

            reviews_url = self._build_reviews_url(product_url)

            reviews, pages_scraped, had_failures = await self._scrape_all_pages(
                page, reviews_url, max_pages
            )

            if not reviews:
                raise ScraperException("No reviews found", 500)

            status = "success" if not had_failures else "partial_success"

            return {
                "product_name": product_name,
                "reviews": reviews,
                "total_reviews": len(reviews),
                "pages_scraped": pages_scraped,
                "status": status,
            }

        except ScraperException:
            raise

        except Exception as e:
            sentry_sdk.capture_exception(e)
            raise ScraperException(str(e), 500)

        finally:
            await self._cleanup()

    # ──────────────────────────────────────────────────────
    # Browser Lifecycle (FIXED)
    # ──────────────────────────────────────────────────────

    async def _launch_browser(self):

        self._playwright = await async_playwright().start()

        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=BROWSER_ARGS,
        )

        self._context = await self._browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1280, "height": 800},
            locale="en-IN",
            timezone_id="Asia/Kolkata",
        )

        await self._context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        """)

    async def _cleanup(self):
        try:
            if self._context:
                await self._context.close()
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
        except Exception as e:
            logger.warning(f"[CLEANUP ERROR] {str(e)}")

    # ──────────────────────────────────────────────────────
    # Core Scraping
    # ──────────────────────────────────────────────────────

    async def _get_product_title(self, page: Page, url: str) -> str:
        try:
            await page.goto(url, timeout=NAVIGATION_TIMEOUT)

            # 🚨 CAPTCHA detection
            if "captcha" in page.url.lower():
                raise ScraperException("Blocked by Amazon (CAPTCHA)", 403)

            await page.wait_for_selector(PRODUCT_TITLE_SELECTOR, timeout=SELECTOR_TIMEOUT)
            el = await page.query_selector(PRODUCT_TITLE_SELECTOR)

            return (await el.inner_text()).strip() if el else "Unknown Product"

        except Exception:
            return "Unknown Product"

    def _build_reviews_url(self, url: str) -> str:
        asin = re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})', url)
        if not asin:
            raise ScraperException("Invalid Amazon URL", 400)

        domain = re.search(r'(https?://[^/]+)', url).group(1)
        return f"{domain}/product-reviews/{asin.group(1)}/?pageNumber=1"

    async def _scrape_all_pages(self, page: Page, base_url: str, max_pages: int) -> Tuple[List[Dict], int, bool]:

        all_reviews = []
        pages_scraped = 0
        had_failures = False

        for i in range(1, max_pages + 1):

            url = re.sub(r'pageNumber=\d+', f'pageNumber={i}', base_url)

            try:
                await page.goto(url, timeout=NAVIGATION_TIMEOUT)

                if "captcha" in page.url.lower():
                    raise ScraperException("Blocked by Amazon", 403)

            except Exception:
                had_failures = True
                continue

            elements = await self._get_review_elements(page)

            if not elements:
                break

            reviews = await self._extract_reviews_from_page(elements)

            if not reviews:
                break

            all_reviews.extend(reviews)
            pages_scraped += 1

            await asyncio.sleep(random.uniform(1.5, 3.0))

        return all_reviews, pages_scraped, had_failures

    # ──────────────────────────────────────────────────────
    # Extraction
    # ──────────────────────────────────────────────────────

    async def _get_review_elements(self, page: Page):

        for selector in REVIEW_CONTAINER_SELECTORS:
            try:
                await page.wait_for_selector(selector, timeout=SELECTOR_TIMEOUT)
                els = await page.query_selector_all(selector)
                if els:
                    return els
            except:
                continue

        return []

    async def _extract_reviews_from_page(self, elements):

        results = []

        for el in elements:
            try:
                r = await self._parse_review(el)
                if r:
                    results.append(r)
            except:
                continue

        return results

    async def _parse_review(self, el):

        title = await self._try(el, REVIEW_TITLE_SELECTORS)
        text = await self._try(el, REVIEW_BODY_SELECTORS)

        if len(text) < MIN_REVIEW_LENGTH:
            return None

        h = hashlib.md5(text.encode()).hexdigest()
        if h in self._seen_reviews:
            return None

        self._seen_reviews.add(h)

        rating_text = await self._try(el, REVIEW_RATING_SELECTORS)
        rating = float(re.search(r'(\d+\.?\d*)', rating_text).group(1)) if rating_text else 0.0

        return {"title": title, "text": text, "rating": rating}

    async def _try(self, el, selectors):

        for s in selectors:
            try:
                node = await el.query_selector(s)
                if node:
                    return (await node.inner_text()).strip()
            except:
                continue
        return ""