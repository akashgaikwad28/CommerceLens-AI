"""
Amazon Review Scraper Service (v2 — Hardened)
==============================================
Production-grade, fault-tolerant scraper built with Playwright (async, headless Chromium).

v2 Upgrades over v1:
    1. Anti-bot hardening   — Chromium flags, realistic context, automation stealth
    2. Rate limiting        — Random human-like delays between page loads
    3. Robust selectors     — Fallback selector chains for every element
    4. Deduplication        — Hash-based seen-set prevents duplicate reviews
    5. Timeout hardening    — Generous timeouts, per-page skip instead of crash
    6. Partial results      — Returns whatever was collected even if later pages fail

Preserved from v1:
    - fetch_reviews() function signature (backward compatible)
    - @retry decorator integration
    - Sentry error forwarding via ScraperException
"""

from typing import List, Dict, Optional, Set
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
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
NAVIGATION_TIMEOUT = 30000       # 30s — generous to handle slow Amazon pages
SELECTOR_TIMEOUT = 10000         # 10s — wait for elements to appear
MIN_REVIEW_LENGTH = 20           # Skip junk reviews like "ok", "good", "nice"
PRODUCT_TITLE_SELECTOR = '#productTitle'
NEXT_PAGE_SELECTOR = 'li.a-last a'

# ──────────────────────────────────────────────────────
# Fallback Selector Chains
# ──────────────────────────────────────────────────────
# Amazon's HTML structure varies by region, device, and A/B tests.
# Instead of relying on a single selector, we try multiple in order.

REVIEW_CONTAINER_SELECTORS = [
    '[data-hook="review"]',          # Primary — most Amazon pages
    '.review',                       # Fallback — older layouts
    '.a-section.review',             # Fallback — some regional variants
]

REVIEW_TITLE_SELECTORS = [
    '[data-hook="review-title"]',    # Primary
    '.review-title',                 # Fallback
    '.a-text-bold span',             # Fallback — some mobile layouts
]

REVIEW_BODY_SELECTORS = [
    '[data-hook="review-body"]',     # Primary
    '.review-text',                  # Fallback
    '.review-text-content',          # Fallback — newer layouts
]

REVIEW_RATING_SELECTORS = [
    '[data-hook="review-star-rating"]',   # Primary
    '.review-rating',                     # Fallback
    '[data-hook="cmps-review-star-rating"]',  # Fallback — compare section
]

# Anti-bot: Chromium launch arguments
BROWSER_ARGS = [
    "--disable-blink-features=AutomationControlled",  # Hide automation flag
    "--no-sandbox",                                   # Required in Docker/CI
    "--disable-dev-shm-usage",                        # Prevent shared memory crashes
    "--disable-gpu",                                  # Headless stability
    "--disable-extensions",                           # Reduce fingerprint
]

# Anti-bot: Realistic user agent (Chrome 124 on Windows 11)
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


class AmazonScraperService:
    """
    Async service that scrapes Amazon product reviews using Playwright.

    Designed for production use:
        - Anti-bot stealth via browser args + realistic context
        - Fallback selectors for resilience across Amazon layouts
        - Hash-based deduplication to prevent duplicate reviews
        - Partial result return on mid-scrape failures
        - Exponential retry via @retry decorator

    Usage:
        scraper = AmazonScraperService()
        result = await scraper.fetch_reviews("https://amazon.in/dp/B0...")
    """

    def __init__(self):
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._seen_reviews: Set[str] = set()  # Deduplication: stores hashes of seen review text

    # ──────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────

    @retry(max_retries=2, delay=3.0)
    async def fetch_reviews(self, product_url: str, max_pages: int = DEFAULT_MAX_PAGES) -> dict:
        """
        Main entry point. Scrapes reviews for a given Amazon product URL.

        Args:
            product_url: Full Amazon product page URL.
            max_pages: Maximum number of review pages to scrape (default: 5).

        Returns:
            {
                "product_name": str,
                "reviews": [{ "title": str, "text": str, "rating": float }, ...],
                "total_reviews": int,
                "pages_scraped": int,
                "status": "success" | "partial_success"
            }

        Raises:
            ScraperException: If scraping fails after all retries AND zero reviews were collected.
        """
        logger.info(f"[SCRAPER START] URL: {product_url} | Max pages: {max_pages}")

        # Reset deduplication set for each new scrape run
        self._seen_reviews.clear()

        try:
            # Step 1: Launch hardened browser
            await self._launch_browser()
            page = await self._context.new_page()

            # Step 2: Extract the product title from the product page
            product_name = await self._get_product_title(page, product_url)
            logger.info(f"Product identified: {product_name}")

            # Step 3: Build the "all reviews" URL and scrape across pages
            reviews_url = self._build_reviews_url(product_url)
            all_reviews, pages_scraped, had_failures = await self._scrape_all_pages(page, reviews_url, max_pages)

            # Step 4: Determine status based on what we collected
            if not all_reviews:
                raise ScraperException(
                    message="Failed to scrape reviews: 0 reviews collected across all pages.",
                    status_code=500
                )

            # "success" = we collected reviews and no pages failed to load.
            # "partial_success" = we got data, but some pages timed out or errored.
            # NOTE: A product with only 3 pages when max_pages=5 is still "success"
            # because that's the natural end of reviews, not a failure.
            status = "success" if not had_failures else "partial_success"

            logger.info(
                f"[SCRAPER DONE] Product: {product_name} | "
                f"Reviews: {len(all_reviews)} | Pages: {pages_scraped}/{max_pages} | "
                f"Status: {status}"
            )

            return {
                "product_name": product_name,
                "reviews": all_reviews,
                "total_reviews": len(all_reviews),
                "pages_scraped": pages_scraped,
                "status": status,
            }

        except ScraperException:
            # Re-raise our own exceptions so the retry decorator can catch them
            raise

        except Exception as e:
            # Capture unexpected errors in Sentry
            sentry_sdk.capture_exception(e)
            logger.error(f"[SCRAPER FAIL] Unexpected error: {str(e)}")
            raise ScraperException(
                message=f"Failed to scrape reviews: {str(e)}",
                status_code=500
            )

        finally:
            # Always close the browser to free resources
            await self._cleanup()

    # ──────────────────────────────────────────────────────
    # Browser Setup (Anti-Bot Hardening)
    # ──────────────────────────────────────────────────────

    async def _launch_browser(self) -> None:
        """
        Launch a hardened headless Chromium browser.

        Anti-bot measures:
            1. --disable-blink-features=AutomationControlled → hides navigator.webdriver
            2. Realistic user-agent string (Chrome 124 on Windows 11)
            3. en-IN locale to match Indian Amazon traffic patterns
            4. Standard viewport (1280x800) — not the default 800x600 which screams "bot"
        """
        playwright = await async_playwright().start()

        self._browser = await playwright.chromium.launch(
            headless=True,
            args=BROWSER_ARGS,
        )

        self._context = await self._browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1280, "height": 800},
            locale="en-IN",                         # Match Amazon India traffic
            timezone_id="Asia/Kolkata",              # Consistent with locale
            java_script_enabled=True,
        )

        # Stealth: Override the navigator.webdriver property that Playwright sets
        await self._context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        """)

        logger.info("[BROWSER] Hardened Chromium launched successfully")

    # ──────────────────────────────────────────────────────
    # Product Title Extraction
    # ──────────────────────────────────────────────────────

    async def _get_product_title(self, page: Page, url: str) -> str:
        """
        Navigate to the product page and extract the product title.

        Falls back to "Unknown Product" if the title element is not found
        (e.g., the page layout is different on certain Amazon domains).
        """
        try:
            await page.goto(url, timeout=NAVIGATION_TIMEOUT, wait_until="domcontentloaded")
            await page.wait_for_selector(PRODUCT_TITLE_SELECTOR, timeout=SELECTOR_TIMEOUT)
            title_element = await page.query_selector(PRODUCT_TITLE_SELECTOR)

            if title_element:
                title = await title_element.inner_text()
                return title.strip()

            return "Unknown Product"

        except Exception as e:
            logger.warning(f"Could not extract product title: {str(e)}")
            return "Unknown Product"

    # ──────────────────────────────────────────────────────
    # ASIN Extraction & URL Building
    # ──────────────────────────────────────────────────────

    def _build_reviews_url(self, product_url: str) -> str:
        """
        Convert a product page URL into the "all reviews" page URL.

        Amazon product URLs contain an ASIN (a 10-character alphanumeric ID).
        We extract it and build the canonical reviews URL.

        Example:
            Input:  https://amazon.in/dp/B0DFHM3GMP/...
            Output: https://amazon.in/product-reviews/B0DFHM3GMP/?pageNumber=1
        """
        # Extract ASIN from the URL (always 10 alphanumeric characters after /dp/ or /gp/product/)
        asin_match = re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})', product_url)

        if not asin_match:
            raise ScraperException(
                message="Could not extract ASIN from the product URL. Please provide a valid Amazon product link.",
                status_code=400
            )

        asin = asin_match.group(1)

        # Determine the Amazon domain (e.g., amazon.in, amazon.com)
        domain_match = re.search(r'(https?://[^/]+)', product_url)
        domain = domain_match.group(1) if domain_match else "https://www.amazon.in"

        reviews_url = f"{domain}/product-reviews/{asin}/?pageNumber=1"
        logger.info(f"Reviews URL built: {reviews_url}")
        return reviews_url

    # ──────────────────────────────────────────────────────
    # Multi-Page Scraping (with Rate Limiting & Partial Return)
    # ──────────────────────────────────────────────────────

    async def _scrape_all_pages(self, page: Page, reviews_url: str, max_pages: int) -> tuple:
        """
        Iterate through review pages and collect all reviews.

        Returns:
            (all_reviews: List[Dict], pages_scraped: int, had_failures: bool)

        Key behaviors:
            - URL-based pagination (not click-based) for reliability
            - Random delay between pages (1.5–3.5s) to mimic human browsing
            - If a page fails to load, we SKIP it instead of crashing
            - had_failures flag tracks if any page actually errored (vs. natural end)
        """
        all_reviews: List[Dict] = []
        pages_scraped = 0
        had_failures = False  # Tracks actual errors, NOT natural end-of-reviews

        for page_num in range(1, max_pages + 1):
            # Build the URL for the current page
            current_url = re.sub(r'pageNumber=\d+', f'pageNumber={page_num}', reviews_url)
            logger.info(f"[PAGE {page_num}/{max_pages}] Navigating: {current_url}")

            # ── Rate Limiting ──
            # Add a random delay between page requests to mimic human browsing.
            # This is critical for avoiding Amazon's bot detection.
            if page_num > 1:
                delay = random.uniform(1.5, 3.5)
                logger.info(f"[RATE LIMIT] Waiting {delay:.1f}s before next page...")
                await asyncio.sleep(delay)

            # ── Navigate to the page ──
            try:
                await page.goto(current_url, timeout=NAVIGATION_TIMEOUT, wait_until="domcontentloaded")
            except Exception as e:
                # Timeout or navigation failure — skip this page, don't crash
                logger.warning(f"[PAGE {page_num}] Navigation failed: {str(e)}. Skipping page.")
                had_failures = True  # This is an actual failure, not a natural stop
                continue

            # ── Find review elements using fallback selectors ──
            review_elements = await self._get_review_elements(page)

            if not review_elements:
                # No reviews found with any selector — natural end of reviews
                logger.info(f"[PAGE {page_num}] No review elements found. Stopping pagination.")
                break

            # ── Extract and deduplicate reviews from this page ──
            page_reviews = await self._extract_reviews_from_page(review_elements)
            pages_scraped += 1

            if not page_reviews:
                logger.info(f"[PAGE {page_num}] 0 new reviews after deduplication. Stopping.")
                break

            all_reviews.extend(page_reviews)
            logger.info(
                f"[PAGE {page_num}] Collected {len(page_reviews)} new reviews "
                f"(total: {len(all_reviews)}, deduplicated: {len(self._seen_reviews)})"
            )

            # ── Check for "Next" page link ──
            next_button = await page.query_selector(NEXT_PAGE_SELECTOR)
            if not next_button and page_num < max_pages:
                logger.info("[PAGINATION] No 'Next' button found. Reached the last page.")
                break

        return all_reviews, pages_scraped, had_failures

    # ──────────────────────────────────────────────────────
    # Robust Selector Strategy
    # ──────────────────────────────────────────────────────

    async def _get_review_elements(self, page: Page) -> list:
        """
        Try multiple CSS selectors to find review container elements.

        Amazon's HTML varies by region, device, and ongoing A/B tests.
        This method tries each selector in REVIEW_CONTAINER_SELECTORS
        and returns results from the first one that matches.

        Returns:
            List of Playwright element handles, or empty list if none found.
        """
        for selector in REVIEW_CONTAINER_SELECTORS:
            try:
                # Wait briefly for the selector to appear
                await page.wait_for_selector(selector, timeout=SELECTOR_TIMEOUT)
                elements = await page.query_selector_all(selector)

                if elements:
                    logger.info(f"[SELECTOR] Found {len(elements)} reviews using: {selector}")
                    return elements

            except Exception:
                # This selector didn't match — try the next one
                logger.debug(f"[SELECTOR] No match for: {selector}")
                continue

        logger.warning("[SELECTOR] All fallback selectors failed. No reviews found on this page.")
        return []

    async def _try_selectors(self, element, selectors: List[str]) -> str:
        """
        Try multiple selectors on a single element, return the inner text of the first match.

        This is the field-level equivalent of _get_review_elements().
        Used for extracting title, body, and rating from individual review cards.

        Args:
            element: The parent review card element.
            selectors: Ordered list of CSS selectors to try.

        Returns:
            The stripped inner text of the first matching selector, or "" if none match.
        """
        for selector in selectors:
            try:
                el = await element.query_selector(selector)
                if el:
                    text = await el.inner_text()
                    return text.strip()
            except Exception:
                continue
        return ""

    # ──────────────────────────────────────────────────────
    # Review Extraction & Deduplication
    # ──────────────────────────────────────────────────────

    async def _extract_reviews_from_page(self, review_elements: list) -> List[Dict]:
        """
        Extract structured review data from a list of review card elements.

        Applies deduplication: reviews with identical body text (by hash)
        are silently skipped.
        """
        reviews: List[Dict] = []

        for element in review_elements:
            try:
                review = await self._parse_single_review(element)
                if review:
                    reviews.append(review)
            except Exception as e:
                # Skip individual review parsing errors — don't break the whole page
                logger.debug(f"Skipped a review due to parsing error: {str(e)}")
                continue

        return reviews

    async def _parse_single_review(self, element) -> Optional[Dict]:
        """
        Parse a single review card element into a structured dict.

        Includes:
            - Fallback selectors for title, body, and rating
            - Hash-based deduplication check
            - Rating extraction via regex from "X.X out of 5 stars"
        """
        # ── Extract title using fallback selectors ──
        title = await self._try_selectors(element, REVIEW_TITLE_SELECTORS)

        # ── Extract body text using fallback selectors ──
        text = await self._try_selectors(element, REVIEW_BODY_SELECTORS)

        # Skip empty reviews (no meaningful content)
        if not text and not title:
            return None

        # ── Review Length Filter ──
        # Skip junk reviews like "ok", "good", "nice" that would pollute AI output.
        # These add noise without insight and waste LLM tokens.
        if len(text) < MIN_REVIEW_LENGTH:
            logger.debug(f"[FILTER] Review too short ({len(text)} chars), skipped: '{text[:30]}'")
            return None

        # ── Deduplication ──
        # Hash the review text to detect duplicates across pages.
        # Amazon sometimes shows the same review on multiple pages.
        review_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
        if review_hash in self._seen_reviews:
            logger.debug(f"[DEDUP] Duplicate review skipped: {title[:40]}...")
            return None
        self._seen_reviews.add(review_hash)

        # ── Extract star rating using fallback selectors ──
        rating = 0.0
        rating_text = await self._try_selectors(element, REVIEW_RATING_SELECTORS)
        if rating_text:
            match = re.search(r'(\d+\.?\d*)', rating_text)
            if match:
                rating = float(match.group(1))

        return {
            "title": title,
            "text": text,
            "rating": rating,
        }

    # ──────────────────────────────────────────────────────
    # Cleanup
    # ──────────────────────────────────────────────────────

    async def _cleanup(self) -> None:
        """Close browser context and browser instance to prevent memory leaks."""
        try:
            if self._context:
                await self._context.close()
            if self._browser:
                await self._browser.close()
            logger.info("[BROWSER] Cleanup complete — browser closed")
        except Exception as e:
            logger.warning(f"[CLEANUP] Warning during browser cleanup: {str(e)}")
