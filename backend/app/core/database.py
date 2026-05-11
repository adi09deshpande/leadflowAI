from functools import lru_cache

from supabase import Client, create_client

from .settings import get_settings


class DatabaseConfigurationError(RuntimeError):
    pass


@lru_cache
def get_db_client() -> Client:
    settings = get_settings()
    try:
        return create_client(settings.supabase_url, settings.supabase_service_role_key)
    except Exception as exc:
        raise DatabaseConfigurationError(
            "Supabase configuration is invalid. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env file."
        ) from exc
