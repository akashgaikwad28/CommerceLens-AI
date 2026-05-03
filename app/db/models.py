from sqlalchemy import Column, String, DateTime, JSON, Integer
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

class ComparisonJob(Base):
    __tablename__ = "comparison_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    comparison_key = Column(String, index=True, nullable=True) # Hash of normalized URLs
    product_urls = Column(JSON, nullable=False) # Store as sorted list of URLs
    product_job_ids = Column(JSON, nullable=True) # Linked AnalysisJob IDs
    status = Column(String, nullable=False, default="pending")
    progress = Column(Integer, default=0)
    stage = Column(String, default="Initialized")
    result = Column(JSON, nullable=True)
    error = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
