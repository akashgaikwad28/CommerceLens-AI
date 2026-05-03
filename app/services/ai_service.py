"""
AI Service — Multi-Provider LLM Orchestrator with Fallback Chain (v2)
=====================================================================
Core intelligence layer of CommerceLens AI.

v2 Upgrades:
    - orchestrate() now returns structured model metadata (provider, model name, fallback flag)
    - Token estimation and cost tracking per call
    - All metadata is passed through to the review processor

Fallback Strategy:
    OpenAI (GPT-4o-mini) → retry once → Gemini (gemini-1.5-flash) → Groq (llama3) → fallback response

LangSmith Integration:
    Every LLM call is wrapped with @traceable for full observability.
"""

import json
import httpx
from typing import Optional, Dict
from langsmith import traceable
from app.core.config import settings
from app.core.logger import get_logger
from app.core.exceptions import AIServiceException

import sentry_sdk

logger = get_logger("ai_service")

# ──────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_MODEL = "gpt-4o-mini"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
GEMINI_MODEL = "gemini-1.5-flash"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama3-8b-8192"

REQUEST_TIMEOUT = 30.0
MIN_RESPONSE_LENGTH = 50

# ──────────────────────────────────────────────────────
# Cost Estimation (per 1M tokens, approximate)
# ──────────────────────────────────────────────────────
COST_PER_1M_TOKENS = {
    "openai":  {"input": 0.15, "output": 0.60},    # GPT-4o-mini pricing
    "gemini":  {"input": 0.00, "output": 0.00},    # Free tier
    "groq":    {"input": 0.00, "output": 0.00},    # Free tier
    "fallback": {"input": 0.00, "output": 0.00},
}

# Rough approximation: 1 token ≈ 4 characters
CHARS_PER_TOKEN = 4


class AIService:
    """
    Multi-provider LLM orchestrator with intelligent fallback,
    token estimation, and structured model metadata.

    Usage:
        ai = AIService()
        result = await ai.orchestrate("Analyze these reviews...")
    """

    def __init__(self):
        self._http_client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT)
        # Track cumulative token usage across all calls in a session
        self._total_input_tokens = 0
        self._total_output_tokens = 0
        self._total_cost = 0.0

    # ──────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────

    @traceable(name="AI Orchestrator")
    async def orchestrate(self, prompt: str) -> Dict:
        """
        Main entry point. Sends a prompt through the fallback chain.

        Returns:
            {
                "content": str,
                "model_used": {
                    "provider": str,
                    "model": str,
                    "fallback_used": bool
                },
                "token_usage": {
                    "input_tokens": int,
                    "output_tokens": int,
                    "estimated_cost_usd": float
                }
            }
        """
        input_tokens = self._estimate_tokens(prompt)

        # ── Attempt 1: OpenAI (primary) ──
        if settings.OPENAI_API_KEY:
            logger.info("[AI] Attempting OpenAI (primary)...")
            response = await self.call_openai(prompt)
            if response and self.validate_response(response):
                logger.info("[AI] OpenAI succeeded on first attempt")
                return self._build_result(response, "openai", OPENAI_MODEL, False, input_tokens)

            # ── Attempt 2: OpenAI retry ──
            logger.warning("[AI] OpenAI failed. Retrying once...")
            response = await self.call_openai(prompt)
            if response and self.validate_response(response):
                logger.info("[AI] OpenAI succeeded on retry")
                return self._build_result(response, "openai", OPENAI_MODEL, False, input_tokens)

        # ── Attempt 3: Gemini fallback ──
        if settings.GEMINI_API_KEY:
            logger.warning("[AI] OpenAI failed. Falling back to Gemini...")
            response = await self.call_gemini(prompt)
            if response and self.validate_response(response):
                logger.info("[AI] Gemini fallback succeeded")
                return self._build_result(response, "gemini", GEMINI_MODEL, True, input_tokens)

        # ── Attempt 4: Groq fallback ──
        if settings.GROQ_API_KEY:
            logger.warning("[AI] Gemini failed. Falling back to Groq...")
            response = await self.call_groq(prompt)
            if response and self.validate_response(response):
                logger.info("[AI] Groq fallback succeeded")
                return self._build_result(response, "groq", GROQ_MODEL, True, input_tokens)

        # ── All providers failed ──
        logger.error("[AI] All providers failed. Returning fallback response.")
        return self._fallback_response()

    def get_session_stats(self) -> Dict:
        """Return cumulative token usage and cost for this session."""
        return {
            "total_input_tokens": self._total_input_tokens,
            "total_output_tokens": self._total_output_tokens,
            "total_estimated_cost_usd": round(self._total_cost, 6),
        }

    @traceable(name="AI Comparison Orchestrator")
    async def orchestrate_comparison(self, structured_data: dict) -> Dict:
        """
        Runs the multi-product comparison logic using the LLM with deterministic structure.
        """
        prompt = f"""You are a senior product strategist.

Compare the following products using strictly structured data. Do NOT use outside knowledge.

{json.dumps(structured_data, indent=2)}

Return ONLY valid JSON in this exact format:
{{
  "winner": "Exact Product Name",
  "reason": "One sentence reason for winning",
  "product_rankings": ["Product A", "Product B"],
  "best_for": {{
    "budget": "Product Name or None",
    "performance": "Product Name or None",
    "overall": "Product Name"
  }},
  "tradeoffs": [
    "Product A has better rating but Product B has fewer complaints"
  ],
  "decision_recommendation": "Actionable final advice",
  "confidence_score": 0.85
}}

RULES:
- Do NOT hallucinate features. Only use the provided structured insights.
- Provide actionable advice in decision_recommendation.
- Ensure all product names match the exact input names.
"""
        return await self.orchestrate(prompt)

    # ──────────────────────────────────────────────────────
    # Provider Implementations
    # ──────────────────────────────────────────────────────

    @traceable(name="OpenAI Call")
    async def call_openai(self, prompt: str) -> Optional[str]:
        """Call OpenAI's Chat Completions API (GPT-4o-mini)."""
        try:
            response = await self._http_client.post(
                OPENAI_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OPENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are an expert e-commerce analyst. Always respond with valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000,
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            logger.info(f"[OpenAI] Response received: {len(content)} chars")
            return content

        except Exception as e:
            logger.error(f"[OpenAI] Failed: {str(e)}")
            sentry_sdk.capture_exception(e)
            return None

    @traceable(name="Gemini Call")
    async def call_gemini(self, prompt: str) -> Optional[str]:
        """Call Google's Gemini API (gemini-1.5-flash)."""
        try:
            url = f"{GEMINI_API_URL}?key={settings.GEMINI_API_KEY}"
            response = await self._http_client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [
                        {
                            "parts": [
                                {"text": f"You are an expert e-commerce analyst. Always respond with valid JSON.\n\n{prompt}"}
                            ]
                        }
                    ],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 2000,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            logger.info(f"[Gemini] Response received: {len(content)} chars")
            return content

        except Exception as e:
            logger.error(f"[Gemini] Failed: {str(e)}")
            sentry_sdk.capture_exception(e)
            return None

    @traceable(name="Groq Call")
    async def call_groq(self, prompt: str) -> Optional[str]:
        """Call Groq's API (llama3-8b via OpenAI-compatible endpoint)."""
        try:
            response = await self._http_client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are an expert e-commerce analyst. Always respond with valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000,
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            logger.info(f"[Groq] Response received: {len(content)} chars")
            return content

        except Exception as e:
            logger.error(f"[Groq] Failed: {str(e)}")
            sentry_sdk.capture_exception(e)
            return None

    # ──────────────────────────────────────────────────────
    # Response Validation
    # ──────────────────────────────────────────────────────

    def validate_response(self, response: str) -> bool:
        """Validate that an LLM response is usable."""
        if not response:
            return False
        if len(response.strip()) < MIN_RESPONSE_LENGTH:
            logger.warning(f"[VALIDATE] Response too short: {len(response)} chars")
            return False
        error_patterns = ["i cannot", "i'm unable", "as an ai", "error:", "rate limit"]
        response_lower = response.lower()
        for pattern in error_patterns:
            if pattern in response_lower:
                logger.warning(f"[VALIDATE] Response contains error pattern: '{pattern}'")
                return False
        return True

    # ──────────────────────────────────────────────────────
    # Token Estimation & Cost
    # ──────────────────────────────────────────────────────

    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count from text (1 token ≈ 4 chars)."""
        return max(1, len(text) // CHARS_PER_TOKEN)

    def _estimate_cost(self, provider: str, input_tokens: int, output_tokens: int) -> float:
        """Estimate the USD cost of an LLM call."""
        rates = COST_PER_1M_TOKENS.get(provider, {"input": 0.0, "output": 0.0})
        cost = (input_tokens * rates["input"] + output_tokens * rates["output"]) / 1_000_000
        return round(cost, 6)

    def _build_result(self, content: str, provider: str, model: str, fallback: bool, input_tokens: int) -> Dict:
        """
        Build the standardized orchestration result with model metadata and cost.

        This is the single place where all successful responses are shaped.
        """
        output_tokens = self._estimate_tokens(content)
        cost = self._estimate_cost(provider, input_tokens, output_tokens)

        # Track cumulative session stats
        self._total_input_tokens += input_tokens
        self._total_output_tokens += output_tokens
        self._total_cost += cost

        logger.info(
            f"[COST] Provider: {provider} | Input: ~{input_tokens} tokens | "
            f"Output: ~{output_tokens} tokens | Cost: ${cost:.6f}"
        )

        return {
            "content": content,
            "model_used": {
                "provider": provider,
                "model": model,
                "fallback_used": fallback,
            },
            "token_usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "estimated_cost_usd": cost,
            },
        }

    # ──────────────────────────────────────────────────────
    # Fallback
    # ──────────────────────────────────────────────────────

    def _fallback_response(self) -> Dict:
        """Return a graceful fallback when all LLM providers fail."""
        return {
            "content": json.dumps({
                "top_buying_reasons": ["AI analysis unavailable — please retry"],
                "top_complaints": ["AI analysis unavailable — please retry"],
                "improvement_suggestions": ["AI analysis unavailable — please retry"],
                "key_patterns": [],
                "confidence_score": 0.0,
            }),
            "model_used": {
                "provider": "fallback",
                "model": "none",
                "fallback_used": True,
            },
            "token_usage": {
                "input_tokens": 0,
                "output_tokens": 0,
                "estimated_cost_usd": 0.0,
            },
        }

    async def close(self) -> None:
        """Close the HTTP client to release connections."""
        await self._http_client.aclose()
