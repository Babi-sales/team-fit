import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user, resolve_target_user_id
from app.database import get_db
from app.models import Goal
from app.schemas import GoalIn, GoalOut

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("/active", response_model=GoalOut)
async def get_active_goal(
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    result = await db.execute(
        select(Goal).where(Goal.user_id == target_id, Goal.ativo.is_(True)).order_by(Goal.created_at.desc())
    )
    goal = result.scalars().first()
    if goal is None:
        raise HTTPException(status_code=404, detail="Nenhuma meta ativa cadastrada")
    return goal


@router.get("", response_model=list[GoalOut])
async def list_goals(
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    result = await db.execute(select(Goal).where(Goal.user_id == target_id).order_by(Goal.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=GoalOut, status_code=201)
async def create_goal(
    payload: GoalIn,
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    # desativa metas anteriores — só uma meta ativa por vez
    previous = await db.execute(select(Goal).where(Goal.user_id == target_id, Goal.ativo.is_(True)))
    for old_goal in previous.scalars().all():
        old_goal.ativo = False

    goal = Goal(user_id=target_id, **payload.model_dump())
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal
