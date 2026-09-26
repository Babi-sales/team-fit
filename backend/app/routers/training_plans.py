import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user, resolve_target_user_id
from app.database import get_db
from app.models import TrainingPlan
from app.schemas import TrainingPlanOut

router = APIRouter(prefix="/training-plans", tags=["training-plans"])


@router.get("", response_model=list[TrainingPlanOut])
async def list_training_plans(
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    result = await db.execute(
        select(TrainingPlan).where(TrainingPlan.user_id == target_id).order_by(TrainingPlan.versao.desc())
    )
    return result.scalars().all()


@router.get("/active", response_model=TrainingPlanOut)
async def get_active_training_plan(
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    result = await db.execute(
        select(TrainingPlan)
        .where(TrainingPlan.user_id == target_id, TrainingPlan.ativo.is_(True))
        .order_by(TrainingPlan.versao.desc())
    )
    plan = result.scalars().first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Nenhum plano de treino ativo")
    return plan
