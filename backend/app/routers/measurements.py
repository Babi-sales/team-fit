import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user, resolve_target_user_id
from app.database import get_db
from app.models import BodyMeasurement
from app.schemas import BodyMeasurementIn, BodyMeasurementOut

router = APIRouter(prefix="/measurements", tags=["measurements"])


@router.get("", response_model=list[BodyMeasurementOut])
async def list_measurements(
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    result = await db.execute(
        select(BodyMeasurement).where(BodyMeasurement.user_id == target_id).order_by(BodyMeasurement.data)
    )
    return result.scalars().all()


@router.post("", response_model=BodyMeasurementOut, status_code=201)
async def upsert_measurement(
    payload: BodyMeasurementIn,
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    values = payload.model_dump()
    # Só atualiza os campos que vieram na requisição — evita que salvar só o
    # abdômen (ex: pela tela de Perfil) apague quadril/peito já registrados
    # para o mesmo dia por outra tela.
    update_values = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if k != "data"}
    stmt = (
        insert(BodyMeasurement)
        .values(user_id=target_id, **values)
        .on_conflict_do_update(
            index_elements=[BodyMeasurement.user_id, BodyMeasurement.data],
            set_=update_values or {"data": BodyMeasurement.data},
        )
        .returning(BodyMeasurement)
    )
    result = await db.execute(stmt)
    await db.commit()
    row = result.first()
    return row[0]
