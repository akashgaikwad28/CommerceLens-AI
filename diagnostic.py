"""
diagnostic.py — Run this standalone to see exactly what Amazon returns.

Usage:
    python diagnostic.py

It will open a visible browser, load the reviews page, and dump:
- Final URL (after any redirects)
- Page title
- First 3000 chars of the HTML body
- A screenshot saved as debug_screenshot.png
"""

import asyncio
from playwright.async_api import async_playwright

ASIN   = "B0FMDL81GS"
DOMAIN = "https://www.amazon.in"

PRODUCT_URL = f"{DOMAIN}/dp/{ASIN}"
REVIEWS_URL = f"{DOMAIN}/product-reviews/{ASIN}/?reviewerType=all_reviews&pageNumber=1"

STEALTH_SCRIPT = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = { runtime: {} };
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
Object.defineProperty(navigator, 'languages', { get: () => ['en-IN', 'en-US'] });
"""

HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Sec-CH-UA": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
}


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,   # VISIBLE so you can watch what happens
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
            slow_mo=300,
        )
        ctx = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="en-IN",
            timezone_id="Asia/Kolkata",
        )
        await ctx.add_init_script(STEALTH_SCRIPT)
        page = await ctx.new_page()
        await page.set_extra_http_headers(HEADERS)

        # ── Step 1: Homepage ──────────────────────────────────────
        print("\n[1] Loading homepage...")
        await page.goto(DOMAIN, wait_until="domcontentloaded")
        await asyncio.sleep(2)
        print(f"    URL   : {page.url}")
        print(f"    Title : {await page.title()}")

        # ── Step 2: Product page ──────────────────────────────────
        print("\n[2] Loading product page...")
        await page.goto(PRODUCT_URL, wait_until="domcontentloaded")
        await asyncio.sleep(2)
        print(f"    URL   : {page.url}")
        print(f"    Title : {await page.title()}")
        title_el = await page.query_selector("#productTitle")
        if title_el:
            print(f"    Product title found: {(await title_el.inner_text()).strip()[:80]}")
        else:
            print("    ⚠️  #productTitle NOT found — product page may also be blocked")

        # ── Step 3: Reviews page ──────────────────────────────────
        print("\n[3] Loading reviews page...")
        await page.goto(REVIEWS_URL, wait_until="domcontentloaded")
        await asyncio.sleep(3)

        final_url = page.url
        title     = await page.title()
        body_html = await page.evaluate("document.body.innerHTML")

        print(f"    Final URL : {final_url}")
        print(f"    Title     : {title}")
        print(f"\n--- Body HTML (first 3000 chars) ---")
        print(body_html[:3000])
        print("--- End ---")

        # ── Save screenshot ───────────────────────────────────────
        await page.screenshot(path="debug_screenshot.png", full_page=False)
        print("\n📸 Screenshot saved: debug_screenshot.png")

        # ── Check for specific selectors ─────────────────────────
        print("\n[4] Selector check on reviews page:")
        checks = [
            '[data-hook="review"]',
            ".review",
            "#cm_cr-review_list",
            "#reviews-medley-cmps-expand-head",
            "form[name='signIn']",
            "#ap_email",
            '[data-hook="review-body"]',
        ]
        for sel in checks:
            el = await page.query_selector(sel)
            status = "✅ FOUND" if el else "❌ not found"
            print(f"    {status}  →  {sel}")

        await asyncio.sleep(5)  # Leave browser open so you can inspect manually
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())