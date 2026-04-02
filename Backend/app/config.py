from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Sensor Simulation"
    debug: bool = True

    # Database
    db_user: str = "sensor"
    db_password: str = "sensor_pass"
    db_host: str = "127.0.0.1"
    db_port: int = 5432
    db_name: str = "sensor_simulation"

    # TCP Ingest
    tcp_ingest_enabled: bool = True
    tcp_ingest_host: str = "127.0.0.1"
    tcp_ingest_port: int = 9000

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://"
            f"{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}"
            f"/{self.db_name}"
        )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
