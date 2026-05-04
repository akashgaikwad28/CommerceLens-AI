import serpapi
import os
import re
import json

# -------------------------------
# 🔐 LOAD API KEY
# -------------------------------
api_key = "4c60382105e4fb020ce6823982e9af3f2d3425307b4e12bce996b168ac277959"

if not api_key:
    raise ValueError("❌ SERPAPI_KEY not found. Set it using: set SERPAPI_KEY=your_key")

client = serpapi.Client(api_key=api_key)


# -------------------------------
# 🧠 HELPERS
# -------------------------------

def extract_rating_and_count(text):
    if not text:
        return None, None

    rating_match = re.search(r"(\d+(\.\d+)?)", text)
    count_match = re.search(r"([\d,]+)\s*Reviews", text, re.IGNORECASE)

    rating = float(rating_match.group(1)) if rating_match else None
    count = int(count_match.group(1).replace(",", "")) if count_match else None

    return rating, count


def extract_from_text_list(text_list, keyword):
    for t in text_list:
        if keyword in t.lower():
            num = re.search(r"\d+(\.\d+)?", t)
            if num:
                return float(num.group())
    return None


def extract_battery_hours(text):
    if not text:
        return None
    match = re.search(r"\d+", str(text))
    return int(match.group()) if match else None


# -------------------------------
# 🔄 NORMALIZER
# -------------------------------

def normalize_product(results):
    product = results.get("product", {})
    specs = results.get("product_details", {})
    about = results.get("about_item", [])
    insights = results.get("reviews_information", {}).get("summary", {}).get("insights", [])

    rating, review_count = extract_rating_and_count(specs.get("customer_reviews"))

    data = {
        "name": product.get("title"),
        "brand": specs.get("brand_name"),
        "rating": rating,
        "review_count": review_count,
    }

    # ---- SPECS ----
    data["specs"] = {
        "battery_hours": extract_battery_hours(specs.get("battery_average_life")),
        "bluetooth_version": float(specs.get("bluetooth_version")) if specs.get("bluetooth_version") else None,
        "latency_ms": extract_from_text_list(about, "latency"),
        "driver_size_mm": extract_from_text_list(about, "mm"),
    }

    # ---- FEATURES ----
    features_raw = specs.get("product_features", "")
    data["features"] = [
        f.strip().lower().replace(" ", "_")
        for f in features_raw.split(",") if f
    ]

    # ---- PROS / CONS ----
    pros, cons = [], []

    for i in insights:
        title = i.get("title")
        sentiment = i.get("sentiment")

        if sentiment == "positive":
            pros.append(title)
        elif sentiment == "negative":
            cons.append(title)
        elif sentiment == "mixed":
            cons.append(title)  # treat mixed as partial cons

    data["pros"] = list(set(pros))
    data["cons"] = list(set(cons))

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

        # Debug check
        if "error" in results:
            print("❌ API Error:", results["error"])
            return None

        return results

    except Exception as e:
        print("❌ Request failed:", str(e))
        return None


# -------------------------------
# 🏁 MAIN EXECUTION
# -------------------------------

if __name__ == "__main__":
    ASIN = "B0FMDL81GS"  # change dynamically later

    print("🔍 Fetching product data...\n")

    raw_data = fetch_product(ASIN)

    if not raw_data:
        print("❌ No data received")
        exit()

    print("✅ Raw keys:", raw_data.keys(), "\n")

    clean_data = normalize_product(raw_data)

    print("📦 Normalized Output:\n")
    print(json.dumps(clean_data, indent=2))