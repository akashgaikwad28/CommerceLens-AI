"""
NLP Service — Text Preprocessing & Lightweight Sentiment Analysis (v3.1)
=======================================================================
Handles everything BEFORE reviews reach the LLM.

v3.1 Upgrades:
    1. Keyword normalization with STEM_MAP + fallback stemming
    2. Sentiment-split keyword extraction (positive vs negative keywords)
    3. Improved consistency metric (v3.1) with bias correction
    4. All existing methods preserved and backward compatible

Responsibilities:
    1. clean_text()                  → Remove emojis, noise, normalize whitespace
    2. filter_reviews()              → Remove junk (short, empty, duplicates)
    3. analyze_sentiment()           → Lightweight ratings-based sentiment scoring
    4. extract_keyword_signals()     → Split positive/negative keyword extraction
"""

import re
import hashlib
from collections import Counter
from typing import List, Dict, Tuple
from app.core.logger import get_logger

logger = get_logger("nlp")

# ──────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────
MIN_REVIEW_LENGTH = 20
TOP_KEYWORDS_COUNT = 15

EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "]+",
    flags=re.UNICODE,
)

# Common English stopwords to exclude from keyword extraction
STOPWORDS = {
    "the", "a", "an", "is", "it", "in", "to", "and", "of", "for",
    "was", "on", "that", "with", "this", "but", "are", "not", "have",
    "has", "had", "from", "they", "been", "its", "very", "just", "so",
    "also", "than", "only", "can", "will", "all", "more", "some", "when",
    "what", "which", "who", "how", "one", "two", "my", "me", "we", "our",
    "you", "your", "i", "be", "do", "did", "no", "or", "if", "as", "at",
    "by", "about", "would", "could", "should", "am", "were", "being",
    "get", "got", "much", "after", "before", "product", "review", "buy",
    "bought", "use", "used", "using", "really", "good", "great", "nice",
    "like", "even", "well", "still", "though", "because", "since",
}

# ──────────────────────────────────────────────────────
# Stemming Map — Normalizes word variants to a root form
# ──────────────────────────────────────────────────────
STEM_MAP = {
    # taste variants
    "tasty": "taste", "tasting": "taste", "tasted": "taste", "tasteless": "taste",
    # pack/packaging variants
    "packaging": "package", "packed": "package", "packing": "package",
    # deliver variants
    "delivery": "deliver", "delivered": "deliver", "delivering": "deliver",
    # quality variants
    "qualities": "quality",
    # price variants
    "pricing": "price", "priced": "price", "prices": "price", "pricey": "price",
    # mix variants
    "mixing": "mix", "mixed": "mix", "mixable": "mix", "mixability": "mix",
    # smell variants
    "smells": "smell", "smelling": "smell", "smelly": "smell",
    # break variants
    "broken": "break", "broke": "break", "breaking": "break",
    # damage variants
    "damaged": "damage", "damages": "damage",
    # seal variants
    "sealed": "seal", "sealing": "seal", "seals": "seal",
    # weight variants
    "weighing": "weight", "weighted": "weight", "weights": "weight",
    # flavor variants
    "flavour": "flavor", "flavors": "flavor", "flavours": "flavor", "flavored": "flavor",
    # value variants
    "valued": "value", "values": "value",
    # work variants
    "works": "work", "working": "work", "worked": "work",
    # powder variants
    "powders": "powder", "powdery": "powder",
    # ship variants
    "shipping": "ship", "shipped": "ship",
    # result variants
    "results": "result", "resulting": "result",
    # sugar variants
    "sugary": "sugar", "sugars": "sugar",
    # protein variants
    "proteins": "protein",
    # scoop variants
    "scoops": "scoop",
    # clump variants
    "clumps": "clump", "clumpy": "clump", "clumping": "clump",
    # authentic variants
    "authenticity": "authentic", "authentication": "authentic",
    # stomach variants
    "stomachs": "stomach",
    # recommend variants
    "recommended": "recommend", "recommending": "recommend", "recommends": "recommend",
    # return variants
    "returned": "return", "returning": "return", "returns": "return",
    # expire variants
    "expired": "expire", "expiring": "expire", "expiry": "expire",
}


class NLPService:
    """
    Lightweight NLP layer for review preprocessing and sentiment analysis.
    """

    # ──────────────────────────────────────────────────────
    # Text Cleaning
    # ──────────────────────────────────────────────────────

    def clean_text(self, text: str) -> str:
        """Clean a single review text for downstream processing."""
        if not text:
            return ""

        text = EMOJI_PATTERN.sub("", text)
        text = re.sub(r"<[^>]+>", "", text)
        text = re.sub(r"[^\w\s.,!?;:'\"-]", " ", text)
        text = re.sub(r"\s+", " ", text)
        text = text.lower()
        text = text.strip()

        return text

    # ──────────────────────────────────────────────────────
    # Review Filtering & Deduplication
    # ──────────────────────────────────────────────────────

    def filter_reviews(self, reviews: List[Dict]) -> List[Dict]:
        """Filter and deduplicate a list of review dicts."""
        filtered: List[Dict] = []
        seen_hashes: set = set()
        original_count = len(reviews)

        for review in reviews:
            cleaned_text = self.clean_text(review.get("text", ""))
            cleaned_title = self.clean_text(review.get("title", ""))

            if len(cleaned_text) < MIN_REVIEW_LENGTH:
                continue

            text_hash = hashlib.md5(cleaned_text.encode("utf-8")).hexdigest()
            if text_hash in seen_hashes:
                continue
            seen_hashes.add(text_hash)

            filtered.append({
                "title": cleaned_title,
                "text": cleaned_text,
                "rating": review.get("rating", 0.0),
            })

        removed_count = original_count - len(filtered)
        logger.info(
            f"[NLP] Filtered reviews: {original_count} → {len(filtered)} "
            f"({removed_count} removed: junk + duplicates)"
        )

        return filtered

    # ──────────────────────────────────────────────────────
    # Sentiment Analysis
    # ──────────────────────────────────────────────────────

    def analyze_sentiment(self, reviews: List[Dict]) -> Dict:
        """Perform lightweight sentiment analysis using Amazon star ratings."""
        if not reviews:
            return {
                "average_score": 0.0, "positive_ratio": 0.0,
                "negative_ratio": 0.0, "neutral_ratio": 0.0, "total_analyzed": 0,
            }

        ratings = [r.get("rating", 0.0) for r in reviews if r.get("rating", 0.0) > 0]

        if not ratings:
            return {
                "average_score": 0.0, "positive_ratio": 0.0,
                "negative_ratio": 0.0, "neutral_ratio": 0.0, "total_analyzed": 0,
            }

        total = len(ratings)
        positive = sum(1 for r in ratings if r >= 4.0)
        negative = sum(1 for r in ratings if r <= 2.0)
        neutral = total - positive - negative

        result = {
            "average_score": round(sum(ratings) / total, 2),
            "positive_ratio": round(positive / total, 2),
            "negative_ratio": round(negative / total, 2),
            "neutral_ratio": round(neutral / total, 2),
            "total_analyzed": total,
        }

        logger.info(
            f"[SENTIMENT] Score: {result['average_score']}/5.0 | "
            f"Positive: {result['positive_ratio']*100:.0f}% | "
            f"Negative: {result['negative_ratio']*100:.0f}% | "
            f"Analyzed: {total} reviews"
        )

        return result

    # ──────────────────────────────────────────────────────
    # Keyword Extraction
    # ──────────────────────────────────────────────────────

    def extract_keyword_signals(self, reviews: List[Dict]) -> Tuple[List[str], List[str], List[str], float]:
        """Extract keywords split by sentiment, with normalization and consistency scoring."""
        positive_counter: Counter = Counter()
        negative_counter: Counter = Counter()
        all_counter: Counter = Counter()

        for review in reviews:
            text = review.get("text", "")
            rating = review.get("rating", 3.0)
            words = self._tokenize_and_normalize(text)

            all_counter.update(words)

            if rating >= 4.0:
                positive_counter.update(words)
            elif rating <= 2.0:
                negative_counter.update(words)

        positive_kw = [w for w, _ in positive_counter.most_common(TOP_KEYWORDS_COUNT)]
        negative_kw = [w for w, _ in negative_counter.most_common(TOP_KEYWORDS_COUNT)]
        all_kw = [w for w, _ in all_counter.most_common(TOP_KEYWORDS_COUNT)]

        consistency = self._compute_keyword_consistency(all_counter)

        logger.info(
            f"[KEYWORDS] Positive: {positive_kw[:5]} | "
            f"Negative: {negative_kw[:5]} | "
            f"Consistency: {consistency:.2f}"
        )

        return positive_kw, negative_kw, all_kw, consistency

    def _tokenize_and_normalize(self, text: str) -> List[str]:
        """
        Tokenize text and normalize words using:
        1. STEM_MAP (primary)
        2. Lightweight fallback stemming (suffix stripping)
        """
        words = re.findall(r'[a-z]{3,}', text.lower())
        normalized = []

        for word in words:
            if word in STOPWORDS:
                continue

            # Step 1: Apply STEM_MAP
            if word in STEM_MAP:
                normalized_word = STEM_MAP[word]

            # Step 2: Fallback normalization (light stemming)
            else:
                normalized_word = word

                if len(word) > 5:
                    if word.endswith("ing"):
                        normalized_word = word[:-3]
                    elif word.endswith("ed"):
                        normalized_word = word[:-2]
                    elif word.endswith("es"):
                        normalized_word = word[:-2]
                    elif word.endswith("s"):
                        normalized_word = word[:-1]

                # Debug log (only when transformation happens)
                if normalized_word != word:
                    logger.debug(f"[NLP] Fallback normalized: {word} → {normalized_word}")

            normalized.append(normalized_word)

        return normalized

    def _compute_keyword_consistency(self, counter: Counter) -> float:
        """
        Improved consistency metric (v3.1):
        - Normalize denominator (min threshold)
        - Measure concentration of top keywords
        """
        if not counter:
            return 0.0

        total_count = sum(counter.values())
        if total_count == 0:
            return 0.0

        # Prevent small sample bias
        adjusted_total = max(total_count, 50)

        top_5_count = sum(count for _, count in counter.most_common(5))
        consistency = top_5_count / adjusted_total

        return round(min(1.0, consistency), 2)