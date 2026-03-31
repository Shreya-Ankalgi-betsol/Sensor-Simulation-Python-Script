from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    async with engine.begin() as conn:
        # Step 1 — Create all tables
        await conn.run_sync(Base.metadata.create_all)

        # Step 2 — Convert to hypertables
        await conn.execute(
            text(
                "SELECT create_hypertable('radar_readings', 'timestamp', "
                "if_not_exists => TRUE);"
            )
        )
        await conn.execute(
            text(
                "SELECT create_hypertable('lidar_readings', 'timestamp', "
                "if_not_exists => TRUE);"
            )
        )