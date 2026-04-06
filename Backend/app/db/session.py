from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
import logging

from app.config import settings

logger = logging.getLogger(__name__)


engine = create_async_engine(
    settings.database_url,
    echo=True,  # Re-enable to see actual SQL statements
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=30,
    pool_recycle=3600,
    connect_args={"ssl": False},
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
            logger.debug("Committing session changes...")
            await session.commit()
            logger.debug("Session committed successfully")
        except Exception as e:
            logger.error(f"Error in session, rolling back: {e}", exc_info=True)
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    async with engine.begin() as conn:
        # Step 1 — Create all tables
        await conn.run_sync(Base.metadata.create_all)

        # Step 1.1 — Enforce unique coordinates for sensors
        await conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_sensors_lat_lng "
                "ON sensors (lat, lng);"
            )
        )

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