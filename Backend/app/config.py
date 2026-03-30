# from pydantic_settings import BaseSettings


# class Settings(BaseSettings):
#     app_name: str = "Sensor Simulation"
#     debug: bool = True
#     database_url: str = "postgresql+asyncpg://sensor:sensor_pass@localhost:5432/sensor_simulation"

#     class Config:
#         env_file = ".env"
#         env_file_encoding = "utf-8"


# settings = Settings()

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Sensor Simulation"
    debug: bool = True
    db_user: str = "sensor"
    db_password: str = "sensor_pass"
    db_name: str = "sensor_simulation"
    db_port: str = "5432"
    db_host: str = "localhost"
    tcp_ingest_enabled: bool = True
    tcp_ingest_host: str = "127.0.0.1"
    tcp_ingest_port: int = 9000

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()