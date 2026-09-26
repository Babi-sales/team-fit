"""Chamadas administrativas ao Supabase Auth (usa a service_role key).

Usado apenas pelo backend para convidar novos usuários por e-mail — o
frontend nunca tem acesso à service_role key.
"""

import httpx

from app.config import get_settings

settings = get_settings()


async def invite_user_by_email(email: str) -> dict:
    """Envia um e-mail de convite via Supabase Auth e retorna o usuário criado
    (inclui o `id` que deve ser usado como app_users.id)."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados (necessários fora do modo local).")
    url = f"{settings.supabase_url}/auth/v1/invite"
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json={"email": email})
    if response.status_code >= 400:
        raise RuntimeError(f"Falha ao convidar usuário no Supabase: {response.status_code} {response.text}")
    return response.json()
