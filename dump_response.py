"""
dump_response.py
================
Run this to see EXACTLY what Amazon returns via your proxy.
It will save the full HTML to a file so we can fix the parser.

Usage:
    python dump_response.py
"""

import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

PROXY_URL = os.getenv("PROXY_URL")  # reads from your .env
ASIN      = "B0FMDL81GS"
DOMAIN    = "https://www.amazon.in"

MOBILE_UA = (
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.6778.135 Mobile Safari/537.36"
)

DESKTOP_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)


async def fetch_and_dump(label: str, url: str, ua: str):
    kwargs = {
        "headers": {
            "User-Agent": ua,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
        },
        "timeout": 20.0,
        "follow_redirects": True,
    }
    if PROXY_URL:
        kwargs["proxy"] = PROXY_URL
        print(f"  Using proxy: {PROXY_URL}")
    else:
        print("  ⚠️  No PROXY_URL in .env — using direct connection")

    try:
        async with httpx.AsyncClient(**kwargs) as client:
            resp = await client.get(url)

            filename = f"dump_{label}.html"
            with open(filename, "w", encoding="utf-8") as f:
                f.write(resp.text)

            print(f"\n{'='*60}")
            print(f"[{label}]")
            print(f"  URL        : {url}")
            print(f"  Final URL  : {resp.url}")
            print(f"  Status     : {resp.status_code}")
            print(f"  Redirected : {'yes' if str(resp.url) != url else 'no'}")
            print(f"  HTML saved : {filename} ({len(resp.text)} chars)")

            # Quick content checks
            html = resp.text.lower()
            checks = {
                "has signin form"   : 'name="signin"' in html or 'id="ap_email"' in html,
                "has review-body"   : 'data-hook="review-body"' in html,
                "has review element": 'data-hook="review"' in html,
                "has review list"   : 'id="cm_cr-review_list"' in html,
                "has captcha"       : 'captcha' in html,
                "has robot check"   : 'robot' in html,
                "has 'no reviews'"  : 'no customer reviews' in html or 'be the first' in html,
            }
            print("\n  Content checks:")
            for k, v in checks.items():
                icon = "✅" if v else "❌"
                print(f"    {icon} {k}")

    except Exception as e:
        print(f"\n[{label}] ERROR: {e}")


async def main():
    print(f"PROXY_URL = {PROXY_URL or '(none)'}\n")

    # Test 1: Ajax endpoint
    await fetch_and_dump(
        "ajax_api",
        f"{DOMAIN}/reviews/ajax/getreviews?asin={ASIN}&pageNumber=1&reviewerType=all_reviews",
        MOBILE_UA,
    )

    # Test 2: Mobile HTML reviews page
    await fetch_and_dump(
        "mobile_html",
        f"{DOMAIN}/product-reviews/{ASIN}/?reviewerType=all_reviews&pageNumber=1",
        MOBILE_UA,
    )

    # Test 3: Desktop reviews page
    await fetch_and_dump(
        "desktop_html",
        f"{DOMAIN}/product-reviews/{ASIN}/?reviewerType=all_reviews&pageNumber=1",
        DESKTOP_UA,
    )

    print("\n\nNext step:")
    print("  Open the saved .html files in your browser to see what Amazon returned.")
    print("  Share the 'Content checks' output above so we can fix the parser.\n")


if __name__ == "__main__":
    asyncio.run(main())