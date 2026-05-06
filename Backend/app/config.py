from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str 
    debug: bool 

    # Database
    db_user: str 
    db_password: str 
    db_host: str 
    db_port: int 
    db_name: str 

    # TCP Ingest
    tcp_ingest_enabled: bool
    tcp_ingest_host: str
    tcp_ingest_port: int


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
