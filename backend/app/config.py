from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    frontend_origins: str = "http://localhost:3000"

    # Shared PIN that gates the whole app (no per-user accounts).
    app_pin: str
    # Used to sign the session cookie issued after a correct PIN.
    session_secret: str

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
