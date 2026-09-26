from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    supabase_jwt_secret: str
    frontend_origins: str = "http://localhost:3000"

    # Só necessários em produção (convite de usuários via Supabase Auth).
    # Em modo local (LOCAL_AUTH_ENABLED=true) não são usados.
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None

    # Ativa o login local (sem Supabase) — usar apenas em desenvolvimento.
    local_auth_enabled: bool = False

    gemini_api_key: str
    gemini_model: str = "gemini-2.5-flash"

    # Opcional — sem isso o e-mail de boas-vindas só é pulado (log), nada quebra.
    # Convite e reset de senha usam o Supabase Auth com Resend configurado como
    # SMTP no painel do Supabase (não usam essa chave).
    resend_api_key: str | None = None
    resend_from_email: str = "Team Fit <onboarding@resend.dev>"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
