import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user, resolve_target_user_id
from app.database import get_db
from app.models import MealPlan
from app.schemas import MealPlanOut

router = APIRouter(prefix="/meal-plans", tags=["meal-plans"])


@router.get("", response_model=list[MealPlanOut])
async def list_meal_plans(
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    result = await db.execute(
        select(MealPlan).where(MealPlan.user_id == target_id).order_by(MealPlan.versao.desc())
    )
    return result.scalars().all()


@router.get("/active", response_model=MealPlanOut)
async def get_active_meal_plan(
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    result = await db.execute(
        select(MealPlan).where(MealPlan.user_id == target_id, MealPlan.ativo.is_(True)).order_by(MealPlan.versao.desc())
    )
    plan = result.scalars().first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Nenhum plano alimentar ativo")
    return plan
