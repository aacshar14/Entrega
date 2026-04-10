from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    # App General Settings
    PROJECT_NAME: str = "Entrega"
    DOMAIN: str = "entrega.space"
    VERSION: str = "1.1"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database URL - DO NOT HARDCODE production values
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/entrega_db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_db_url(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
            # SQLAlchemy 1.4+ requires 'postgresql://' instead of 'postgres://'
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql://", 1)
        return v

    # WhatsApp Cloud API (Meta)
    WHATSAPP_APP_ID: str = "1018948523791138"  # Principal ID for EntregaWapp
    WHATSAPP_APP_SECRET: Optional[str] = None
    WHATSAPP_VERIFY_TOKEN: str = "Entr3gA_WABA_Secure_2024_PROD_v1"  # Overwrite in .env
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None

    # Security
    ALLOW_INSECURE_WEBHOOKS: bool = False  # MUST REMAIN FALSE IN PRODUCTION
    SECRET_KEY: str = "development_secret_key_change_me_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Supabase Settings
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_ANON_KEY: str = "your-anon-key"
    SUPABASE_JWT_SECRET: str = (
        "your-jwt-secret"  # LEGACY: No longer used for ES256/JWKS production auth
    )

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=True, extra="ignore"
    )


settings = Settings()
