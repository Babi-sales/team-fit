import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import require_session
from app.database import get_db
from app.deps import get_person_id
from app.models import Food, Goal, MealLog, MealLogItem
from app.schemas import DailyTotals, MealLogIn, MealLogItemIn, MealLogItemOut, MealLogOut

router = APIRouter(prefix="/meal-logs", tags=["meal-logs"], dependencies=[Depends(require_session)])


async def _active_goal(db: AsyncSession, person_id: uuid.UUID) -> Goal | None:
    result = await db.execute(select(Goal).where(Goal.person_id == person_id, Goal.active.is_(True)))
    return result.scalars().first()


async def _daily_totals(db: AsyncSession, person_id: uuid.UUID, day: date, goal: Goal | None) -> DailyTotals:
    result = await db.execute(
        select(MealLog)
        .where(MealLog.person_id == person_id, MealLog.date == day)
        .options(selectinload(MealLog.items))
        .order_by(MealLog.time)
    )
    meals = result.scalars().all()
    total_kcal = sum(float(item.kcal) for meal in meals for item in meal.items)
    total_protein = sum(float(item.protein_g) for meal in meals for item in meal.items)
    target_kcal = goal.target_kcal_day if goal else None
    target_protein = goal.target_protein_g_day if goal else None
    return DailyTotals(
        date=day,
        total_kcal=round(total_kcal, 1),
        total_protein=round(total_protein, 1),
        target_kcal=target_kcal,
        target_protein=target_protein,
        kcal_diff=round(total_kcal - target_kcal, 1) if target_kcal else None,
        protein_diff=round(total_protein - target_protein, 1) if target_protein else None,
        meals=meals,
    )


@router.get("", response_model=list[MealLogOut])
async def list_meal_logs(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(MealLog).where(MealLog.person_id == person_id).options(selectinload(MealLog.items))
    if date_from:
        stmt = stmt.where(MealLog.date >= date_from)
    if date_to:
        stmt = stmt.where(MealLog.date <= date_to)
    result = await db.execute(stmt.order_by(MealLog.date.desc(), MealLog.time))
    return result.scalars().all()


@router.post("", response_model=MealLogOut, status_code=201)
async def create_meal_log(
    payload: MealLogIn,
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    meal = MealLog(person_id=person_id, **payload.model_dump())
    db.add(meal)
    await db.commit()
    await db.refresh(meal, attribute_names=["items"])
    return meal


@router.delete("/{meal_log_id}", status_code=204)
async def delete_meal_log(
    meal_log_id: uuid.UUID,
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MealLog).where(MealLog.id == meal_log_id, MealLog.person_id == person_id))
    meal = result.scalar_one_or_none()
    if meal:
        await db.delete(meal)
        await db.commit()


@router.post("/{meal_log_id}/items", response_model=MealLogItemOut, status_code=201)
async def add_meal_log_item(
    meal_log_id: uuid.UUID,
    payload: MealLogItemIn,
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    meal_result = await db.execute(select(MealLog).where(MealLog.id == meal_log_id, MealLog.person_id == person_id))
    if meal_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Meal log not found")

    if payload.food_id is not None:
        food_result = await db.execute(select(Food).where(Food.id == payload.food_id))
        food = food_result.scalar_one_or_none()
        if food is None:
            raise HTTPException(status_code=404, detail="Food not found")
        if not payload.quantity_g:
            raise HTTPException(status_code=400, detail="quantity_g is required when food_id is set")
        ratio = payload.quantity_g / 100
        kcal = round(float(food.kcal_per_100g) * ratio, 1)
        protein_g = round(float(food.protein_per_100g) * ratio, 1)
    else:
        if not payload.free_text_description:
            raise HTTPException(status_code=400, detail="free_text_description is required when food_id is not set")
        kcal = payload.kcal or 0
        protein_g = payload.protein_g or 0

    item = MealLogItem(
        meal_log_id=meal_log_id,
        food_id=payload.food_id,
        free_text_description=payload.free_text_description,
        quantity_g=payload.quantity_g,
        kcal=kcal,
        protein_g=protein_g,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=204)
async def delete_meal_log_item(
    item_id: uuid.UUID,
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MealLogItem)
        .join(MealLog, MealLogItem.meal_log_id == MealLog.id)
        .where(MealLogItem.id == item_id, MealLog.person_id == person_id)
    )
    item = result.scalar_one_or_none()
    if item:
        await db.delete(item)
        await db.commit()


@router.get("/daily", response_model=DailyTotals)
async def get_daily_totals(
    date: date = Query(...),
    person_id: uuid.UUID = Depends(get_person_id),
    db: AsyncSession = Depends(get_db),
):
    goal = await _active_goal(db, person_id)
    return await _daily_totals(db, person_id, date, goal)
