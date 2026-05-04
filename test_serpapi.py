import serpapi
import os
import re
import json

# -------------------------------
# 🔐 LOAD API KEY
# -------------------------------
api_key = "4c60382105e4fb020ce6823982e9af3f2d3425307b4e12bce996b168ac277959"

if not api_key:
    raise ValueError("SERPAPI_KEY not found.")

client = serpapi.Client(api_key=api_key)


# -------------------------------
# 🧠 ENHANCED HELPERS
# -------------------------------

def extract_rating_and_count(text):
    if not text: return None, None
    rating_match = re.search(r"(\d+(\.\d+)?)", text)
    count_match = re.search(r"([\d,]+)\s*Reviews", text, re.IGNORECASE)
    rating = float(rating_match.group(1)) if rating_match else None
    count = int(count_match.group(1).replace(",", "")) if count_match else None
    return rating, count

def extract_spec(text_list, pattern):
    for t in text_list:
        match = re.search(pattern, str(t), re.IGNORECASE)
        if match:
            return float(match.group(1))
    return None

def get_sentiment_label(rating):
    if not rating: return "Unknown"
    if rating >= 4.5: return "Exceptional"
    if rating >= 4.0: return "Highly Recommended"
    if rating >= 3.5: return "Good Choice"
    return "Mixed Reviews"


# -------------------------------
# 🔄 FINAL BUSINESS NORMALIZER
# -------------------------------

def normalize_product(results):
    product = results.get("product_results", {})
    specs_raw = results.get("product_details", {})
    about = results.get("about_item", [])
    rev_info = results.get("reviews_information", {})
    
    # Insights (Pros/Cons)
    insights = rev_info.get("summary", {}).get("insights", [])

    # Extract raw reviews from any possible source
    raw_reviews = results.get("authors_reviews", [])
    if not raw_reviews: raw_reviews = results.get("reviews", [])
    if not raw_reviews:
        raw_reviews = rev_info.get("other_countries_reviews", []) or rev_info.get("reviews", [])

    rating, review_count = extract_rating_and_count(specs_raw.get("customer_reviews"))

    data = {
        "id": product.get("asin") or ASIN,
        "name": product.get("title"),
        "brand": specs_raw.get("brand_name"),
        "rating": rating,
        "review_count": review_count,
        "sentiment_label": get_sentiment_label(rating),
    }

    # ---- SPECS ----
    data["specs"] = {
        "battery_hours": extract_spec(about + [specs_raw.get("battery_average_life", "")], r"(\d+)\s*hr"),
        "bluetooth_version": extract_spec(about + [specs_raw.get("bluetooth_version", "")], r"Bluetooth\s*(\d+\.\d+)"),
        "latency_ms": extract_spec(about, r"(\d+)\s*ms"),
        "driver_size_mm": extract_spec(about, r"(\d+\.?\d*)\s*mm"),
    }

    # ---- FEATURES ----
    features_raw = specs_raw.get("product_features", "")
    data["features"] = [f.strip().lower().replace(" ", "_") for f in features_raw.split(",") if f]

    # ---- PROS / CONS ----
    data["pros"] = list(set([i.get("title") for i in insights if i.get("sentiment") == "positive"]))
    data["cons"] = list(set([i.get("title") for i in insights if i.get("sentiment") in ["negative", "mixed"]]))

    # ---- REPRESENTATIVE REVIEWS ----
    data["representative_reviews"] = []
    
    # 1. Try raw review sources
    for r in raw_reviews[:3]:
        data["representative_reviews"].append({
            "title": r.get("title") or "Review",
            "snippet": (r.get("text") or r.get("body") or "")[:200] + "...",
            "rating": r.get("rating")
        })
    
    # 2. Fallback to Insights Examples (highly relevant snippets)
    if not data["representative_reviews"]:
        for insight in insights[:3]:
            for ex in insight.get("examples", [])[:1]: # Take 1 example per insight
                data["representative_reviews"].append({
                    "title": f"About {insight.get('title')}",
                    "snippet": ex.get("snippet", "") + "...",
                    "rating": None # Insights snippets don't usually have individual ratings
                })

    return data


# -------------------------------
# 🚀 FETCH FUNCTION
# -------------------------------

def fetch_product(asin):
    try:
        results = client.search({
            "engine": "amazon_product",
            "asin": asin,
            "amazon_domain": "amazon.in",
            "device": "mobile"
        })
        return results
    except Exception as e:
        print("Request failed:", str(e))
        return None


# -------------------------------
# 🏁 MAIN EXECUTION
# -------------------------------

if __name__ == "__main__":
    ASIN = "B0FMDL81GS"
    STORAGE_DIR = "scraped_data"
    if not os.path.exists(STORAGE_DIR): os.makedirs(STORAGE_DIR)

    print(f"Fetching final business data for: {ASIN}...")
    raw_data = fetch_product(ASIN)

    if raw_data:
        clean_data = normalize_product(raw_data)
        
        filepath = os.path.join(STORAGE_DIR, f"{ASIN}_final.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(clean_data, f, indent=2)

        print(f"Success! Data saved to: {filepath}")
        print("\n--- FINAL PREVIEW ---")
        print(json.dumps(clean_data, indent=2))