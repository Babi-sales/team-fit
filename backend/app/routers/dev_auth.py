"""Login local sem Supabase — SOMENTE para desenvolvimento (LOCAL_AUTH_ENABLED=true).

Emite um JWT no mesmo formato que o Supabase Auth geraria (assinado com
SUPABASE_JWT_SECRET, claims `sub`/`aud`/`email`), então toda a verificação em
app/auth.py funciona sem alterações — o backend não sabe (nem precisa saber)
se o token veio do Supabase real ou deste emissor local.
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.email_client import send_invite_email, send_password_reset_email, send_welcome_email
from app.models import AppUser

router = APIRouter(prefix="/dev-auth", tags=["dev-auth"])
settings = get_settings()


class DevLoginIn(BaseModel):
    email: str
    full_name: str


class DevLoginOut(BaseModel):
    access_token: str
    user_id: str
    role: str


def _require_local_mode() -> None:
    if not settings.local_auth_enabled:
        raise HTTPException(status_code=404, detail="Login local desativado (LOCAL_AUTH_ENABLED=false)")


@router.post("/login", response_model=DevLoginOut)
async def dev_login(payload: DevLoginIn, db: AsyncSession = Depends(get_db)):
    _require_local_mode()

    result = await db.execute(select(AppUser).where(AppUser.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None:
        count_result = await db.execute(select(func.count()).select_from(AppUser))
        is_first_user = (count_result.scalar() or 0) == 0
        user = AppUser(
            id=uuid.uuid4(),
            email=payload.email,
            full_name=payload.full_name,
            role="admin" if is_first_user else "invited",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        await asyncio.to_thread(send_welcome_email, user.email, user.full_name)

    expire = datetime.now(timezone.utc) + timedelta(days=7)
    token = jwt.encode(
        {"sub": str(user.id), "aud": "authenticated", "email": user.email, "exp": expire},
        settings.supabase_jwt_secret,
        algorithm="HS256",
    )
    return DevLoginOut(access_token=token, user_id=str(user.id), role=user.role)


class TestEmailIn(BaseModel):
    tipo: Literal["convite", "reset", "boas_vindas"]
    email: str
    full_name: str = "Usuário de Teste"


@router.post("/test-email")
async def send_test_email(payload: TestEmailIn):
    """Dispara um dos 3 templates de e-mail via Resend, sem depender de convite
    ou reset de senha reais — só para validar a entrega/visual localmente."""
    _require_local_mode()
    app_url = settings.cors_origins[0] if settings.cors_origins else "http://localhost:3000"

    if payload.tipo == "convite":
        await asyncio.to_thread(
            send_invite_email, payload.email, payload.full_name, "Administrador de Teste", app_url
        )
    elif payload.tipo == "reset":
        reset_link = f"{app_url}/redefinir-senha?token=teste-123"
        await asyncio.to_thread(send_password_reset_email, payload.email, payload.full_name, reset_link)
    else:
        await asyncio.to_thread(send_welcome_email, payload.email, payload.full_name)

    return {
        "status": "ok",
        "detalhe": "E-mail disparado — confira a caixa de entrada e, se não chegar, os logs do backend (RESEND_API_KEY configurada?).",
    }
