import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_session
from app.database import get_db
from app.deps import get_person_id
from app.models import TrainingPlan
from app.schemas import TrainingPlanIn, TrainingPlanOut

router = APIRouter(prefix="/training-plans", tags=["training-plans"], dependencies=[Depends(require_session)])


@router.get("", response_model=list[TrainingPlanOut])
async def list_training_plans(
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TrainingPlan).where(TrainingPlan.person_id == person_id).order_by(TrainingPlan.version.desc())
    )
    return result.scalars().all()


@router.get("/active", response_model=TrainingPlanOut)
async def get_active_training_plan(
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TrainingPlan)
        .where(TrainingPlan.person_id == person_id, TrainingPlan.active.is_(True))
        .order_by(TrainingPlan.version.desc())
    )
    plan = result.scalars().first()
    if plan is None:
        raise HTTPException(status_code=404, detail="No active training plan")
    return plan


@router.post("", response_model=TrainingPlanOut, status_code=201)
async def create_training_plan(
    payload: TrainingPlanIn,
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    # New manually-entered version deactivates the previous one — same
    # "only one active at a time" pattern as goals.
    previous = await db.execute(
        select(TrainingPlan).where(TrainingPlan.person_id == person_id, TrainingPlan.active.is_(True))
    )
    for old_plan in previous.scalars().all():
        old_plan.active = False

    max_version = await db.execute(select(func.max(TrainingPlan.version)).where(TrainingPlan.person_id == person_id))
    next_version = (max_version.scalar() or 0) + 1

    plan = TrainingPlan(person_id=person_id, version=next_version, **payload.model_dump())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan
