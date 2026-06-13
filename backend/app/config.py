from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/app_db"
    allowed_origins: str = "*"
    allow_credentials: bool = False
    supabase_url: str = ""
    supabase_anon_key: str = ""

    # ルート計算（OSRM）
    osrm_base_url: str = "https://router.project-osrm.org"

    # コイン購入（Stripe テスト環境）
    stripe_secret_key: str = ""          # sk_test_...
    stripe_webhook_secret: str = ""      # whsec_...（Stripe CLI / ダッシュボードで取得）
    # 1 コインあたりの日本円（1 コイン = 1 円）
    coin_to_yen_rate: int = 1
    # 決済後のリダイレクト先（Stripe Checkout の success/cancel URL）
    frontend_base_url: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
