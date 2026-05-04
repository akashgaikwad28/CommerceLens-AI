import asyncio
import random
from playwright.async_api import Page

async def simulate_human(page: Page):
    """Simulates human-like interactions on the page to build trust with anti-bot systems."""
    
    # 1. Random idle pause
    await asyncio.sleep(random.uniform(1.5, 3.5))
    
    # 2. Gradual scrolling
    try:
        total_scroll = random.randint(500, 1500)
        current_scroll = 0
        while current_scroll < total_scroll:
            step = random.randint(150, 400)
            await page.evaluate(f"window.scrollBy(0, {step})")
            current_scroll += step
            await asyncio.sleep(random.uniform(0.3, 0.8))
            
        # Slight scroll back up (human correction)
        await page.evaluate(f"window.scrollBy(0, -{random.randint(100, 300)})")
    except Exception:
        pass

    # 3. Random Mouse Movement (Move to random elements)
    try:
        links = await page.query_selector_all('a')
        if links:
            target = random.choice(links[:10])
            await target.hover()
            await asyncio.sleep(random.uniform(0.5, 1.2))
    except Exception:
        pass

    # 4. Final hesitation
    await asyncio.sleep(random.uniform(1.0, 2.0))
