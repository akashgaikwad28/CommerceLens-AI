from pydantic import BaseModel
from typing import List, Optional

class ReviewAnalyzeRequest(BaseModel):
    product_id: str
    reviews: List[str]
    max_summary_length: Optional[int] = 500
