import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user, resolve_target_user_id
from app.database import get_db
from app.models import WeightLog
from app.schemas import WeightLogIn, WeightLogOut

router = APIRouter(prefix="/weight-logs", tags=["weight"])


@router.get("", response_model=list[WeightLogOut])
async def list_weight_logs(
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    result = await db.execute(select(WeightLog).where(WeightLog.user_id == target_id).order_by(WeightLog.data))
    return result.scalars().all()


@router.post("", response_model=WeightLogOut, status_code=201)
async def upsert_weight_log(
    payload: WeightLogIn,
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    stmt = (
        insert(WeightLog)
        .values(user_id=target_id, **payload.model_dump())
        .on_conflict_do_update(
            index_elements=[WeightLog.user_id, WeightLog.data],
            set_={"peso_kg": payload.peso_kg, "observacao": payload.observacao},
        )
        .returning(WeightLog)
    )
    result = await db.execute(stmt)
    await db.commit()
    row = result.first()
    return row[0]
