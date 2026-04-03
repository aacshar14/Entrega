from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    # App General Settings
    PROJECT_NAME: str = "EntréGA V1"
    DOMAIN: str = "entrga.space"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database URL - DO NOT HARDCODE production values
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/entrega_db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def trim_db_url(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v

    # WhatsApp Cloud API (Meta)
    WHATSAPP_VERIFY_TOKEN: str = "default_verify_token" # Overwrite in .env
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None

    # Security
    SECRET_KEY: str = "development_secret_key_change_me_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    # Supabase Settings
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_ANON_KEY: str = "your-anon-key"
    SUPABASE_JWT_SECRET: str = "your-jwt-secret" # Used for JWT validation

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
