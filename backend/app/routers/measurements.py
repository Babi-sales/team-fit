import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_session
from app.database import get_db
from app.deps import get_person_id
from app.models import BodyMeasurement
from app.schemas import BodyMeasurementIn, BodyMeasurementOut

router = APIRouter(prefix="/measurements", tags=["measurements"], dependencies=[Depends(require_session)])


@router.get("", response_model=list[BodyMeasurementOut])
async def list_measurements(
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BodyMeasurement).where(BodyMeasurement.person_id == person_id).order_by(BodyMeasurement.date)
    )
    return result.scalars().all()


@router.post("", response_model=BodyMeasurementOut, status_code=201)
async def upsert_measurement(
    payload: BodyMeasurementIn,
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    values = payload.model_dump()
    # Only overwrite fields present in the request — otherwise saving just the
    # waist (e.g. from the Profile screen) would wipe hip/chest already logged
    # for the same day from another screen.
    update_values = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if k != "date"}
    stmt = (
        insert(BodyMeasurement)
        .values(person_id=person_id, **values)
        .on_conflict_do_update(
            index_elements=[BodyMeasurement.person_id, BodyMeasurement.date],
            set_=update_values or {"date": BodyMeasurement.date},
        )
        .returning(BodyMeasurement)
    )
    result = await db.execute(stmt)
    await db.commit()
    row = result.first()
    return row[0]
