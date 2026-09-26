import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user, require_admin
from app.config import get_settings
from app.database import get_db
from app.email_client import send_invite_email
from app.models import AppUser
from app.schemas import InviteUserIn, UserOut
from app.supabase_admin import invite_user_by_email

settings = get_settings()

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(current_user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppUser).where(AppUser.id == current_user.id))
    return result.scalar_one()


@router.get("", response_model=list[UserOut])
async def list_users(_: CurrentUser = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppUser).order_by(AppUser.created_at))
    return result.scalars().all()


@router.post("/invite", response_model=UserOut, status_code=201)
async def invite_user(
    payload: InviteUserIn,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(AppUser).where(AppUser.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Já existe um usuário com esse e-mail")

    if settings.local_auth_enabled:
        # Sem Supabase Auth em modo local: cria o usuário direto — ele "loga"
        # depois só com nome + e-mail na tela de login local.
        new_id = uuid.uuid4()
    else:
        supabase_user = await invite_user_by_email(payload.email)
        new_id = uuid.UUID(supabase_user["id"])

    new_user = AppUser(
        id=new_id,
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    app_url = settings.cors_origins[0] if settings.cors_origins else "http://localhost:3000"
    await asyncio.to_thread(send_invite_email, new_user.email, new_user.full_name, current_user.full_name, app_url)
    return new_user
