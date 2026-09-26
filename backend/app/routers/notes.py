import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user, resolve_target_user_id
from app.database import get_db
from app.models import AdherenceNote
from app.schemas import AdherenceNoteOut

router = APIRouter(prefix="/adherence-notes", tags=["adherence-notes"])


@router.get("", response_model=list[AdherenceNoteOut])
async def list_adherence_notes(
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    result = await db.execute(
        select(AdherenceNote).where(AdherenceNote.user_id == target_id).order_by(AdherenceNote.criado_em.desc())
    )
    return result.scalars().all()
