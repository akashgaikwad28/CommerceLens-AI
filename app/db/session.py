from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from app.core.config import settings

# Determine database URL. Fallback to default if not present.
DATABASE_URL = settings.DATABASE_URL or "sqlite+aiosqlite:///./commerce_lens.db"

# Create async engine for SQLite. Note: SQLite doesn't strictly need NullPool, 
# but it's safe for aiosqlite in concurrent contexts if needed. 
engine = create_async_engine(
    DATABASE_URL, 
    echo=False, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autoflush=False
)

async def get_db():
    """FastAPI dependency to yield an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
