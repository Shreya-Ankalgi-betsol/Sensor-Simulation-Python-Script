from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Sensor Surveillance System"
    debug: bool = True
    database_url: str = "sqlite+aiosqlite:///./sensor_surveillance.db"

    class Config:
        env_file = ".env"


settings = Settings()