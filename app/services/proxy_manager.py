"""
Proxy Manager
=============
Manages proxy rotation for the scraper.

Supports:
- Free rotating proxies from pubproxy.com / proxyscrape (for dev/testing)
- Paid residential proxies (Webshare, Bright Data, Oxylabs) via env vars
- No-proxy mode (direct connection)

Priority:
1. If PROXY_URL is set in .env → use that (your paid proxy)
2. If USE_FREE_PROXIES=true → fetch and rotate free proxies (unreliable, dev only)
3. Otherwise → direct connection (will hit sign-in wall on flagged IPs)

.env variables:
    PROXY_URL=http://user:pass@proxy.provider.com:8080   # paid residential proxy
    USE_FREE_PROXIES=false                                # set true for dev testing
"""

import httpx
import random
import asyncio
from typing import Optional, List
from app.core.logger import get_logger
from app.core.config import settings

logger = get_logger("proxy_manager")

# Free proxy list API (for dev/testing only — unreliable in production)
FREE_PROXY_API = "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=IN,US&ssl=all&anonymity=elite"


class ProxyManager:
    """
    Singleton-style proxy manager.
    Call get_proxy() to get the next proxy URL string or None.
    """

    def __init__(self):
        self._paid_proxy: Optional[str] = getattr(settings, "PROXY_URL", None)
        self._use_free: bool = getattr(settings, "USE_FREE_PROXIES", False)
        self._free_pool: List[str] = []
        self._pool_index: int = 0
        self._lock = asyncio.Lock()

    async def get_proxy(self) -> Optional[str]:
        """Returns a proxy URL string or None if running direct."""

        # 1. Paid proxy — always preferred
        if self._paid_proxy:
            logger.info(f"[PROXY] Using configured paid proxy")
            return self._paid_proxy

        # 2. Free proxy pool (dev/testing)
        if self._use_free:
            async with self._lock:
                if not self._free_pool:
                    await self._refresh_free_pool()
                if self._free_pool:
                    proxy = self._free_pool[self._pool_index % len(self._free_pool)]
                    self._pool_index += 1
                    logger.info(f"[PROXY] Using free proxy: {proxy}")
                    return f"http://{proxy}"

        # 3. Direct connection
        logger.info("[PROXY] No proxy configured — using direct connection")
        return None

    def mark_failed(self, proxy_url: str):
        """Remove a failing proxy from the free pool."""
        proxy = proxy_url.replace("http://", "")
        if proxy in self._free_pool:
            self._free_pool.remove(proxy)
            logger.warning(f"[PROXY] Removed failed proxy: {proxy} ({len(self._free_pool)} remaining)")

    async def _refresh_free_pool(self):
        """Fetch a fresh list of free proxies."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(FREE_PROXY_API)
                if resp.status_code == 200:
                    proxies = [p.strip() for p in resp.text.strip().split("\n") if ":" in p]
                    self._free_pool = proxies[:20]  # Keep top 20
                    self._pool_index = 0
                    logger.info(f"[PROXY] Refreshed free proxy pool: {len(self._free_pool)} proxies")
        except Exception as e:
            logger.warning(f"[PROXY] Failed to fetch free proxies: {e}")
            self._free_pool = []


# Global singleton
proxy_manager = ProxyManager()