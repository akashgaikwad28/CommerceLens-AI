from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.orm import declarative_base
import uuid
from datetime import datetime, timezone

Base = declarative_base()

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_url = Column(String, nullable=False)
    product_name = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending, processing, completed, failed
    result = Column(JSON, nullable=True)
    error = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
