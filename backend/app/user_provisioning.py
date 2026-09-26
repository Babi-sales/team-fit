import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.email_client import send_invite_email
from app.models import AppUser
from app.supabase_admin import invite_user_by_email

settings = get_settings()


async def get_or_create_app_user(
    db: AsyncSession, email: str, full_name: str, invited_by: str, role: str = "invited"
) -> AppUser:
    """Retorna o app_user com esse e-mail, criando-o (e convidando via Supabase
    Auth fora do modo local) se ainda não existir. `invited_by` é o nome de quem
    convidou, usado no e-mail de convite."""
    existing = await db.execute(select(AppUser).where(AppUser.email == email))
    user = existing.scalar_one_or_none()
    if user is not None:
        return user

    if settings.local_auth_enabled:
        new_id = uuid.uuid4()
    else:
        supabase_user = await invite_user_by_email(email)
        new_id = uuid.UUID(supabase_user["id"])

    user = AppUser(id=new_id, email=email, full_name=full_name, role=role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    app_url = settings.cors_origins[0] if settings.cors_origins else "http://localhost:3000"
    await asyncio.to_thread(send_invite_email, user.email, user.full_name, invited_by, app_url)
    return user
