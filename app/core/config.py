from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "CommerceLens-AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # AI/ML Settings
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    
    # Sentry
    SENTRY_DSN: Optional[str] = None
    
    # Database
    DATABASE_URL: Optional[str] = None
    
    # LangSmith
    LANGSMITH_TRACING: Optional[str] = None
    LANGSMITH_ENDPOINT: Optional[str] = None
    LANGSMITH_API_KEY: Optional[str] = None
    LANGSMITH_PROJECT: Optional[str] = None
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"  # Allow extra env vars without crashing

settings = Settings()
