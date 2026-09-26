import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_session
from app.database import get_db
from app.models import Food
from app.schemas import FoodIn, FoodOut

router = APIRouter(prefix="/foods", tags=["foods"], dependencies=[Depends(require_session)])


@router.get("", response_model=list[FoodOut])
async def list_foods(
    q: str | None = Query(None, description="Search by name"),
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Food)
    if q:
        stmt = stmt.where(Food.name.ilike(f"%{q}%"))
    if category:
        stmt = stmt.where(Food.category == category)
    result = await db.execute(stmt.order_by(Food.name))
    return result.scalars().all()


@router.post("", response_model=FoodOut, status_code=201)
async def create_food(payload: FoodIn, db: AsyncSession = Depends(get_db)):
    food = Food(**payload.model_dump())
    db.add(food)
    await db.commit()
    await db.refresh(food)
    return food


@router.put("/{food_id}", response_model=FoodOut)
async def update_food(food_id: uuid.UUID, payload: FoodIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Food).where(Food.id == food_id))
    food = result.scalar_one_or_none()
    if food is None:
        raise HTTPException(status_code=404, detail="Food not found")
    for field, value in payload.model_dump().items():
        setattr(food, field, value)
    await db.commit()
    await db.refresh(food)
    return food
