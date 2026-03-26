from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Sensor Simulation"
    debug: bool = True
    database_url: str = "postgresql+asyncpg://sensor:sensor_pass@localhost:5432/sensor_simulation"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()