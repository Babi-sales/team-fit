"""Execução real (no banco) das ferramentas que os agentes podem chamar via
function calling do Gemini."""

import uuid
from datetime import date as date_cls
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdherenceNote, FamilyMember, Goal, MealPlan, TrainingPlan, WeeklyMenu


async def _family_member_ids(db: AsyncSession, user_id: uuid.UUID) -> list[uuid.UUID]:
    membership = await db.execute(select(FamilyMember).where(FamilyMember.user_id == user_id))
    member = membership.scalar_one_or_none()
    if member is None:
        return [user_id]
    result = await db.execute(select(FamilyMember.user_id).where(FamilyMember.family_id == member.family_id))
    return [row[0] for row in result.all()]


async def _definir_meta(db: AsyncSession, user_id: uuid.UUID, args: dict) -> dict:
    previous = await db.execute(select(Goal).where(Goal.user_id == user_id, Goal.ativo.is_(True)))
    for old_goal in previous.scalars().all():
        old_goal.ativo = False

    goal = Goal(
        user_id=user_id,
        tipo=args["tipo"],
        peso_meta_kg=args.get("peso_meta_kg"),
        meta_kcal_dia=int(args["meta_kcal_dia"]),
        meta_proteina_g_dia=int(args["meta_proteina_g_dia"]),
    )
    db.add(goal)
    await db.commit()
    return {
        "status": "ok",
        "tipo": goal.tipo,
        "meta_kcal_dia": goal.meta_kcal_dia,
        "meta_proteina_g_dia": goal.meta_proteina_g_dia,
    }


async def _criar_plano_alimentar(db: AsyncSession, user_id: uuid.UUID, args: dict) -> dict:
    previous = await db.execute(select(MealPlan).where(MealPlan.user_id == user_id, MealPlan.ativo.is_(True)))
    for old_plan in previous.scalars().all():
        old_plan.ativo = False

    max_versao = await db.execute(select(func.max(MealPlan.versao)).where(MealPlan.user_id == user_id))
    next_versao = (max_versao.scalar() or 0) + 1

    plan = MealPlan(
        user_id=user_id,
        versao=next_versao,
        titulo=args["titulo"],
        conteudo=args["conteudo"],
        kcal_alvo=args.get("kcal_alvo"),
        proteina_alvo_g=args.get("proteina_alvo_g"),
        ativo=True,
    )
    db.add(plan)
    await db.commit()
    return {"status": "ok", "versao": plan.versao, "titulo": plan.titulo}


async def _criar_plano_treino(db: AsyncSession, user_id: uuid.UUID, args: dict) -> dict:
    previous = await db.execute(select(TrainingPlan).where(TrainingPlan.user_id == user_id, TrainingPlan.ativo.is_(True)))
    for old_plan in previous.scalars().all():
        old_plan.ativo = False

    max_versao = await db.execute(select(func.max(TrainingPlan.versao)).where(TrainingPlan.user_id == user_id))
    next_versao = (max_versao.scalar() or 0) + 1

    plan = TrainingPlan(
        user_id=user_id,
        versao=next_versao,
        titulo=args["titulo"],
        conteudo=args["conteudo"],
        ativo=True,
    )
    db.add(plan)
    await db.commit()
    return {"status": "ok", "versao": plan.versao, "titulo": plan.titulo}


async def _registrar_anotacao(db: AsyncSession, user_id: uuid.UUID, agente: str, args: dict) -> dict:
    note = AdherenceNote(user_id=user_id, agente=agente, nota=args["nota"])
    db.add(note)
    await db.commit()
    return {"status": "ok"}


async def _criar_cardapio_semanal(db: AsyncSession, user_id: uuid.UUID, args: dict) -> dict:
    member_ids = await _family_member_ids(db, user_id)
    semana_inicio = date_cls.fromisoformat(args["semana_inicio"])
    conteudo = args["conteudo"]

    for member_id in member_ids:
        previous = await db.execute(
            select(WeeklyMenu).where(WeeklyMenu.user_id == member_id, WeeklyMenu.ativo.is_(True))
        )
        for old_menu in previous.scalars().all():
            if old_menu.semana_inicio != semana_inicio:
                old_menu.ativo = False

        existing = await db.execute(
            select(WeeklyMenu).where(WeeklyMenu.user_id == member_id, WeeklyMenu.semana_inicio == semana_inicio)
        )
        row = existing.scalar_one_or_none()
        if row:
            row.conteudo = conteudo
            row.ativo = True
        else:
            db.add(WeeklyMenu(user_id=member_id, semana_inicio=semana_inicio, conteudo=conteudo, ativo=True))

    await db.commit()
    return {"status": "ok", "membros_atualizados": len(member_ids)}


async def execute_tool(name: str, args: dict[str, Any], db: AsyncSession, user_id: uuid.UUID, agente: str) -> dict:
    if name == "definir_meta":
        return await _definir_meta(db, user_id, args)
    if name == "criar_plano_alimentar":
        return await _criar_plano_alimentar(db, user_id, args)
    if name == "criar_plano_treino":
        return await _criar_plano_treino(db, user_id, args)
    if name == "registrar_anotacao":
        return await _registrar_anotacao(db, user_id, agente, args)
    if name == "criar_cardapio_semanal":
        return await _criar_cardapio_semanal(db, user_id, args)
    return {"status": "erro", "mensagem": f"ferramenta desconhecida: {name}"}
