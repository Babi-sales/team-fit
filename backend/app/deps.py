import uuid

from fastapi import HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.database import get_db
from app.models import Person

VALID_SLUGS = ("paulo", "barbara")


async def get_person_id(
    person: str = Query(..., description="paulo | barbara"),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID:
    if person not in VALID_SLUGS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid person")
    result = await db.execute(select(Person.id).where(Person.slug == person))
    person_id = result.scalar_one_or_none()
    if person_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found — run the seed script first",
        )
    return person_id
