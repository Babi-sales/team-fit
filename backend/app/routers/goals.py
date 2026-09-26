import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_session
from app.database import get_db
from app.deps import get_person_id
from app.models import Goal
from app.schemas import GoalIn, GoalOut

router = APIRouter(prefix="/goals", tags=["goals"], dependencies=[Depends(require_session)])


@router.get("/active", response_model=GoalOut)
async def get_active_goal(
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Goal).where(Goal.person_id == person_id, Goal.active.is_(True)).order_by(Goal.created_at.desc())
    )
    goal = result.scalars().first()
    if goal is None:
        raise HTTPException(status_code=404, detail="No active goal set")
    return goal


@router.get("", response_model=list[GoalOut])
async def list_goals(
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Goal).where(Goal.person_id == person_id).order_by(Goal.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=GoalOut, status_code=201)
async def create_goal(
    payload: GoalIn,
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    # Deactivate previous goals — only one active goal at a time.
    previous = await db.execute(select(Goal).where(Goal.person_id == person_id, Goal.active.is_(True)))
    for old_goal in previous.scalars().all():
        old_goal.active = False

    goal = Goal(person_id=person_id, **payload.model_dump())
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal
