import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_session
from app.database import get_db
from app.deps import get_person_id
from app.models import WeightLog
from app.schemas import WeightLogIn, WeightLogOut

router = APIRouter(prefix="/weight-logs", tags=["weight"], dependencies=[Depends(require_session)])


@router.get("", response_model=list[WeightLogOut])
async def list_weight_logs(
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(WeightLog).where(WeightLog.person_id == person_id).order_by(WeightLog.date))
    return result.scalars().all()


@router.post("", response_model=WeightLogOut, status_code=201)
async def upsert_weight_log(
    payload: WeightLogIn,
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        insert(WeightLog)
        .values(person_id=person_id, **payload.model_dump())
        .on_conflict_do_update(
            index_elements=[WeightLog.person_id, WeightLog.date],
            set_={"weight_kg": payload.weight_kg, "note": payload.note},
        )
        .returning(WeightLog)
    )
    result = await db.execute(stmt)
    await db.commit()
    row = result.first()
    return row[0]
