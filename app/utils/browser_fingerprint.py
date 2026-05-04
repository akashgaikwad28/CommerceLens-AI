import random
from typing import Dict

MOBILE_CONFIGS = [
    {
        "user_agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "viewport": {"width": 412, "height": 915},
        "device_scale_factor": 2.6,
        "is_mobile": True,
        "has_touch": True,
    },
    {
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "viewport": {"width": 390, "height": 844},
        "device_scale_factor": 3,
        "is_mobile": True,
        "has_touch": True,
    },
    {
        "user_agent": "Mozilla/5.0 (Linux; Android 14; Samsung Galaxy S23 Ultra) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "viewport": {"width": 384, "height": 854},
        "device_scale_factor": 4,
        "is_mobile": True,
        "has_touch": True,
    }
]

def get_random_browser_config() -> Dict:
    """Returns a randomized mobile browser configuration for Playwright context."""
    config = random.choice(MOBILE_CONFIGS).copy()
    
    # Standard Indian Locale for Amazon.in
    config.update({
        "locale": "en-IN",
        "timezone_id": "Asia/Kolkata",
    })
    
    return config
