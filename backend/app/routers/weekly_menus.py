import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user, resolve_target_user_id
from app.database import get_db
from app.models import WeeklyMenu
from app.schemas import WeeklyMenuIn, WeeklyMenuOut

router = APIRouter(prefix="/weekly-menus", tags=["weekly-menus"])


@router.get("", response_model=list[WeeklyMenuOut])
async def list_weekly_menus(
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    result = await db.execute(
        select(WeeklyMenu).where(WeeklyMenu.user_id == target_id).order_by(WeeklyMenu.semana_inicio.desc())
    )
    return result.scalars().all()


@router.get("/current", response_model=WeeklyMenuOut)
async def get_current_weekly_menu(
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    result = await db.execute(
        select(WeeklyMenu)
        .where(WeeklyMenu.user_id == target_id, WeeklyMenu.ativo.is_(True))
        .order_by(WeeklyMenu.semana_inicio.desc())
    )
    menu = result.scalars().first()
    if menu is None:
        raise HTTPException(status_code=404, detail="Nenhum cardápio ativo")
    return menu


@router.post("", response_model=WeeklyMenuOut, status_code=201)
async def upsert_weekly_menu(
    payload: WeeklyMenuIn,
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)

    previous = await db.execute(select(WeeklyMenu).where(WeeklyMenu.user_id == target_id, WeeklyMenu.ativo.is_(True)))
    for old_menu in previous.scalars().all():
        old_menu.ativo = False

    stmt = (
        insert(WeeklyMenu)
        .values(user_id=target_id, ativo=True, **payload.model_dump())
        .on_conflict_do_update(
            index_elements=[WeeklyMenu.user_id, WeeklyMenu.semana_inicio],
            set_={"conteudo": payload.conteudo, "ativo": True},
        )
        .returning(WeeklyMenu)
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.first()[0]
