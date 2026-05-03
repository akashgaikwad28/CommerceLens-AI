from pydantic import BaseModel
from typing import Any, Dict

class ReviewAnalyzeResponse(BaseModel):
    status: str
    data: Dict[str, Any]
