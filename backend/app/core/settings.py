from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "LeadFlow AI API"
    environment: str = "development"
    frontend_origins: str = "http://localhost:5173,http://localhost:3000"
    admin_username: str = "admin"
    admin_password: str = "admin123"
    auth_token: str = "leadflow-admin-token"

    gemini_api_key: str
    gemini_model: str = "gemini-2.5-flash"

    resend_api_key: str = ""
    resend_from_email: str = ""
    resend_reply_to: str = ""

    supabase_url: str
    supabase_service_role_key: str
    supabase_leads_table: str = "leads"
    supabase_emails_table: str = "emails"
    supabase_activity_table: str = "activity"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
