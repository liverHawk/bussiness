from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/app_db"
    allowed_origins: str = "*"
    allow_credentials: bool = False
    supabase_url: str = ""
    supabase_anon_key: str = ""

    # ルート計算（OSRM）
    osrm_base_url: str = "https://router.project-osrm.org"

    # コイン購入（Stripe）
    stripe_secret_key: str = ""
    # 1 コインあたりの日本円（例: 100 コイン = 500 円）
    coin_to_yen_rate: int = 5
    # 決済後のリダイレクト先（Stripe Checkout の success/cancel URL）
    frontend_base_url: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
