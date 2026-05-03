from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "CommerceLens-AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # AI/ML Settings (Placeholders)
    OPENAI_API_KEY: str = ""
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
