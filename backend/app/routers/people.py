from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_session
from app.database import get_db
from app.deps import VALID_SLUGS
from app.models import Person
from app.schemas import PersonIn, PersonOut

router = APIRouter(prefix="/people", tags=["people"], dependencies=[Depends(require_session)])


@router.get("", response_model=list[PersonOut])
async def list_people(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Person).order_by(Person.slug))
    return result.scalars().all()


async def _get_person_or_404(slug: str, db: AsyncSession) -> Person:
    if slug not in VALID_SLUGS:
        raise HTTPException(status_code=400, detail="Invalid person")
    result = await db.execute(select(Person).where(Person.slug == slug))
    person = result.scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found — run the seed script first")
    return person


@router.get("/{slug}", response_model=PersonOut)
async def get_person(slug: str, db: AsyncSession = Depends(get_db)):
    return await _get_person_or_404(slug, db)


@router.put("/{slug}", response_model=PersonOut)
async def update_person(slug: str, payload: PersonIn, db: AsyncSession = Depends(get_db)):
    person = await _get_person_or_404(slug, db)
    for field, value in payload.model_dump().items():
        setattr(person, field, value)
    await db.commit()
    await db.refresh(person)
    return person
