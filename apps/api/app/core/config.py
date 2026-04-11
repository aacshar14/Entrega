from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    # --- 🏢 Platform General ---
    PROJECT_NAME: str = "Entrega"
    DOMAIN: str = "entrega.space"
    VERSION: str = "1.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # --- 🗄️ Infrastructure (Database & Auth) ---
    # DO NOT HARDCODE production credentials in this file.
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/entrega_db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_db_url(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql://", 1)
        return v

    # Supabase (Identity & Persistence)
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_ANON_KEY: str = "your-anon-key"
    SUPABASE_JWT_SECRET: str = "your-jwt-secret"  # Used for local/legacy validation

    # --- 🛡️ Security & Lifecycle ---
    ALLOW_INSECURE_WEBHOOKS: bool = False  # DO NOT ENABLE IN PRODUCTION
    SECRET_KEY: str = "development_secret_key_change_me_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # --- 📱 Meta / WhatsApp Integration ---
    # Primary Entrega App ID for Embedded Signup
    WHATSAPP_APP_ID: str = "1018948523791138"
    WHATSAPP_APP_SECRET: Optional[str] = None
    WHATSAPP_CONFIG_ID: str = "1716962075608553"
    WHATSAPP_VERIFY_TOKEN: str = "Entr3gA_WABA_Secure_2024_PROD_v1"

    # --- 📊 Feature Flags & Dashboard ---
    ENABLE_PLATFORM_UI: bool = True
    METRIC_SNAPSHOT_WINDOW_MINUTES: int = 15

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=True, extra="ignore"
    )


settings = Settings()
