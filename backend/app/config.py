from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/app_db"
    allowed_origins: str = "*"
    allow_credentials: bool = False

    @property
    def origins(self) -> list[str]:
        origins = [o.strip() for o in self.allowed_origins.split(",")]
        if "*" in  origins:
            return ["*"]
        return origins

    class Config:
        env_file = ".env"


settings = Settings()
