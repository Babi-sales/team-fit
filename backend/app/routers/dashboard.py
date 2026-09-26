import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_session
from app.database import get_db
from app.deps import get_person_id
from app.health_indices import compute_health_indices
from app.models import BodyMeasurement, Goal, MealLog, MealLogItem, Person, WeightLog
from app.schemas import DailyKcalPoint, DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(require_session)])


async def _daily_kcal_series(
    db: AsyncSession, person_id: uuid.UUID, days: int, target_kcal: int | None
) -> list[DailyKcalPoint]:
    end = date.today()
    start = end - timedelta(days=days - 1)

    result = await db.execute(
        select(MealLog.date, func.coalesce(func.sum(MealLogItem.kcal), 0))
        .join(MealLogItem, MealLogItem.meal_log_id == MealLog.id)
        .where(MealLog.person_id == person_id, MealLog.date >= start, MealLog.date <= end)
        .group_by(MealLog.date)
    )
    totals_by_date = {row[0]: float(row[1]) for row in result.all()}

    return [
        DailyKcalPoint(
            date=start + timedelta(days=offset),
            total_kcal=round(totals_by_date.get(start + timedelta(days=offset), 0.0), 1),
            target_kcal=target_kcal,
        )
        for offset in range(days)
    ]


@router.get("", response_model=DashboardSummary)
async def get_dashboard(
    days: int = Query(14, ge=1, le=90),
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    person_result = await db.execute(select(Person).where(Person.id == person_id))
    person = person_result.scalar_one_or_none()

    weight_result = await db.execute(select(WeightLog).where(WeightLog.person_id == person_id).order_by(WeightLog.date))
    weight_history = weight_result.scalars().all()

    measurements_result = await db.execute(
        select(BodyMeasurement).where(BodyMeasurement.person_id == person_id).order_by(BodyMeasurement.date)
    )
    measurement_history = measurements_result.scalars().all()

    indices = compute_health_indices(
        height_cm=float(person.height_cm) if person and person.height_cm else None,
        sex=person.sex if person else None,
        weight_logs=weight_history,
        measurements=measurement_history,
    )

    goal_result = await db.execute(select(Goal).where(Goal.person_id == person_id, Goal.active.is_(True)))
    goal = goal_result.scalars().first()

    current_weight = float(weight_history[-1].weight_kg) if weight_history else None
    initial_weight = float(weight_history[0].weight_kg) if weight_history else None

    daily_kcal_series = await _daily_kcal_series(
        db, person_id, days, goal.target_kcal_day if goal else None
    )

    return DashboardSummary(
        current_weight_kg=current_weight,
        initial_weight_kg=initial_weight,
        target_weight_kg=float(goal.target_weight_kg) if goal and goal.target_weight_kg else None,
        weight_change_kg=round(current_weight - initial_weight, 1) if current_weight and initial_weight else None,
        weight_history=weight_history,
        measurement_history=measurement_history,
        target_kcal=goal.target_kcal_day if goal else None,
        target_protein=goal.target_protein_g_day if goal else None,
        daily_kcal_series=daily_kcal_series,
        indices=indices,
    )
