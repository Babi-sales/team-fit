import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.database import get_db
from app.models import AppUser, Family, FamilyMember
from app.schemas import FamilyCreateIn, FamilyDetail, FamilyMemberDetail, InviteFamilyMemberIn
from app.user_provisioning import get_or_create_app_user

router = APIRouter(prefix="/families", tags=["families"])


async def _load_family_detail(db: AsyncSession, family: Family) -> FamilyDetail:
    result = await db.execute(
        select(FamilyMember, AppUser)
        .join(AppUser, AppUser.id == FamilyMember.user_id)
        .where(FamilyMember.family_id == family.id)
        .order_by(FamilyMember.entrou_em)
    )
    membros = [
        FamilyMemberDetail(user_id=user.id, full_name=user.full_name, email=user.email, papel=member.papel)
        for member, user in result.all()
    ]
    return FamilyDetail(id=family.id, nome=family.nome, membros=membros)


async def _require_chief_family(db: AsyncSession, current_user: CurrentUser) -> Family:
    membership_result = await db.execute(
        select(FamilyMember).where(FamilyMember.user_id == current_user.id, FamilyMember.papel == "chefe")
    )
    membership = membership_result.scalar_one_or_none()
    if membership is None:
        raise HTTPException(status_code=403, detail="Só o Chefe da Família pode fazer isso")
    family_result = await db.execute(select(Family).where(Family.id == membership.family_id))
    return family_result.scalar_one()


@router.get("/me", response_model=FamilyDetail)
async def get_my_family(current_user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    membership_result = await db.execute(select(FamilyMember).where(FamilyMember.user_id == current_user.id))
    membership = membership_result.scalar_one_or_none()
    if membership is None:
        raise HTTPException(status_code=404, detail="Você ainda não faz parte de um grupo familiar")
    family_result = await db.execute(select(Family).where(Family.id == membership.family_id))
    family = family_result.scalar_one()
    return await _load_family_detail(db, family)


@router.post("", response_model=FamilyDetail, status_code=201)
async def create_family(
    payload: FamilyCreateIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(FamilyMember).where(FamilyMember.user_id == current_user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Você já faz parte de um grupo familiar")

    family = Family(nome=payload.nome, criado_por=current_user.id)
    db.add(family)
    await db.flush()
    db.add(FamilyMember(family_id=family.id, user_id=current_user.id, papel="chefe"))
    await db.commit()
    return await _load_family_detail(db, family)


@router.post("/members", response_model=FamilyDetail, status_code=201)
async def invite_family_member(
    payload: InviteFamilyMemberIn,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    family = await _require_chief_family(db, current_user)

    member_user = await get_or_create_app_user(
        db, payload.email, payload.full_name, invited_by=current_user.full_name, role="invited"
    )

    existing_membership = await db.execute(select(FamilyMember).where(FamilyMember.user_id == member_user.id))
    membership = existing_membership.scalar_one_or_none()
    if membership is not None:
        if membership.family_id == family.id:
            raise HTTPException(status_code=409, detail="Essa pessoa já está no grupo")
        raise HTTPException(status_code=409, detail="Essa pessoa já faz parte de outro grupo familiar")

    db.add(FamilyMember(family_id=family.id, user_id=member_user.id, papel="membro"))
    await db.commit()
    return await _load_family_detail(db, family)


@router.delete("/members/{user_id}", response_model=FamilyDetail)
async def remove_family_member(
    user_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    family = await _require_chief_family(db, current_user)
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="O Chefe da Família não pode remover a si mesmo")

    result = await db.execute(
        select(FamilyMember).where(FamilyMember.family_id == family.id, FamilyMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=404, detail="Essa pessoa não está no grupo")
    await db.delete(member)
    await db.commit()
    return await _load_family_detail(db, family)
