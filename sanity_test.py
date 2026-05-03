import asyncio
import json
import os
from dotenv import load_dotenv

# Load environment variables (API keys, etc.)
load_dotenv()

# Set dummy keys if not present to avoid initialization errors, 
# although real keys are better for "LLM works" check.
if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = "sk-dummy"

from app.services.review_processor import ReviewProcessor

async def run_sanity_test():
    print("Starting ReviewProcessor Sanity Test...")
    
    processor = ReviewProcessor()
    
    # Test data: Two reviews (one positive, one negative)
    # Note: MIN_REVIEW_LENGTH is 20, so these might be filtered out if too short.
    # Let's make them a bit longer to pass NLP filter.
    test_reviews = [
        {"text": "Great taste and quality, definitely worth the price and would buy again.", "rating": 5, "title": "Excellent product"},
        {"text": "Packaging was damaged on arrival and the seal was broken. Very disappointing experience.", "rating": 2, "title": "Poor shipping"},
    ]
    
    try:
        result = await processor.process_reviews(
            reviews=test_reviews,
            product_name="Test Product"
        )
        
        print("\nTest Completed Successfully!")
        print("-" * 30)
        print(f"Structure Check:")
        print(f"- Sentiment Score: {result.get('sentiment_score')}")
        print(f"- Confidence Score: {result.get('confidence_score')}")
        print(f"- Buying Reasons Count: {len(result.get('top_buying_reasons', []))}")
        print(f"- Complaints Count: {len(result.get('top_complaints', []))}")
        print(f"- Model Used: {result.get('model_used', {}).get('model')}")
        print(f"- Processing Time: {result.get('processing_time_ms')}ms")
        print("-" * 30)
        
        # Verify JSON structure
        required_keys = [
            "sentiment_score", "positive_ratio", "negative_ratio",
            "top_buying_reasons", "top_complaints", "improvement_suggestions",
            "key_patterns", "confidence_score", "model_used",
            "reviews_analyzed", "total_reviews_scraped", "cost_metrics",
            "estimated_tokens", "processing_time_ms"
        ]
        
        missing_keys = [k for k in required_keys if k not in result]
        if missing_keys:
            print(f"Missing Keys: {missing_keys}")
        else:
            print("All required keys present.")
            
        print("\nFull Result JSON:")
        print(json.dumps(result, indent=4))
        
    except Exception as e:
        print(f"\nException Thrown: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_sanity_test())
