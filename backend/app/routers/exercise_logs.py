import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user, resolve_target_user_id
from app.database import get_db
from app.models import ExerciseLog
from app.schemas import ExerciseLogIn, ExerciseLogOut

router = APIRouter(prefix="/exercise-logs", tags=["exercise"])

# MET (Metabolic Equivalent of Task) aproximado por tipo/intensidade — usado
# para estimar kcal quando o front não envia kcal_estimado manualmente.
MET_TABLE = {
    ("musculacao", "leve"): 3.5,
    ("musculacao", "moderada"): 5.0,
    ("musculacao", "intensa"): 6.0,
    ("caminhada", "leve"): 3.0,
    ("caminhada", "moderada"): 4.3,
    ("caminhada", "intensa"): 5.0,
    ("corrida", "leve"): 7.0,
    ("corrida", "moderada"): 9.8,
    ("corrida", "intensa"): 12.0,
    ("outro", "leve"): 3.0,
    ("outro", "moderada"): 5.0,
    ("outro", "intensa"): 7.0,
}


def estimate_kcal(tipo_exercicio: str, intensidade: str, duracao_min: int, peso_kg: float = 75.0) -> float:
    met = MET_TABLE.get((tipo_exercicio, intensidade), 5.0)
    # kcal = MET * peso(kg) * duração(h)
    return round(met * peso_kg * (duracao_min / 60), 1)


@router.get("", response_model=list[ExerciseLogOut])
async def list_exercise_logs(
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    result = await db.execute(select(ExerciseLog).where(ExerciseLog.user_id == target_id).order_by(ExerciseLog.data))
    return result.scalars().all()


@router.post("", response_model=ExerciseLogOut, status_code=201)
async def create_exercise_log(
    payload: ExerciseLogIn,
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    kcal = payload.kcal_estimado or estimate_kcal(payload.tipo_exercicio, payload.intensidade, payload.duracao_min)
    log = ExerciseLog(user_id=target_id, **{**payload.model_dump(), "kcal_estimado": kcal})
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log
