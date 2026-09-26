import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.gemini_client import AIServiceError
from app.agents.nutrition import estimate_meal_macros
from app.auth import CurrentUser, get_current_user, resolve_target_user_id
from app.database import get_db
from app.models import ExerciseLog, Goal, MealLog
from app.schemas import DailyTotals, MealLogIn, MealLogOut, WeeklyConsolidated

router = APIRouter(prefix="/meal-logs", tags=["meal-logs"])


async def _active_goal(db: AsyncSession, user_id: uuid.UUID) -> Goal | None:
    result = await db.execute(select(Goal).where(Goal.user_id == user_id, Goal.ativo.is_(True)))
    return result.scalars().first()


async def _daily_totals(db: AsyncSession, user_id: uuid.UUID, day: date, goal: Goal | None) -> DailyTotals:
    result = await db.execute(select(MealLog).where(MealLog.user_id == user_id, MealLog.data == day).order_by(MealLog.horario))
    logs = result.scalars().all()
    kcal_total = sum(float(log.kcal) for log in logs)
    proteina_total = sum(float(log.proteina_g) for log in logs)
    meta_kcal = goal.meta_kcal_dia if goal else None
    meta_proteina = goal.meta_proteina_g_dia if goal else None
    return DailyTotals(
        data=day,
        kcal_total=round(kcal_total, 1),
        proteina_total=round(proteina_total, 1),
        meta_kcal=meta_kcal,
        meta_proteina=meta_proteina,
        diferenca_kcal=round(kcal_total - meta_kcal, 1) if meta_kcal else None,
        diferenca_proteina=round(proteina_total - meta_proteina, 1) if meta_proteina else None,
        refeicoes=logs,
    )


@router.get("", response_model=list[MealLogOut])
async def list_meal_logs(
    data_inicio: date | None = Query(None),
    data_fim: date | None = Query(None),
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    stmt = select(MealLog).where(MealLog.user_id == target_id)
    if data_inicio:
        stmt = stmt.where(MealLog.data >= data_inicio)
    if data_fim:
        stmt = stmt.where(MealLog.data <= data_fim)
    result = await db.execute(stmt.order_by(MealLog.data.desc(), MealLog.horario))
    return result.scalars().all()


@router.post("", response_model=MealLogOut, status_code=201)
async def create_meal_log(
    payload: MealLogIn,
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)

    kcal = payload.kcal
    proteina_g = payload.proteina_g
    if kcal is None or proteina_g is None:
        try:
            estimado = estimate_meal_macros(payload.descricao)
        except AIServiceError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        kcal = estimado["kcal"] if kcal is None else kcal
        proteina_g = estimado["proteina_g"] if proteina_g is None else proteina_g

    log = MealLog(
        user_id=target_id,
        data=payload.data,
        horario=payload.horario,
        refeicao=payload.refeicao,
        descricao=payload.descricao,
        kcal=kcal,
        proteina_g=proteina_g,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


@router.delete("/{meal_log_id}", status_code=204)
async def delete_meal_log(
    meal_log_id: uuid.UUID,
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    result = await db.execute(select(MealLog).where(MealLog.id == meal_log_id, MealLog.user_id == target_id))
    log = result.scalar_one_or_none()
    if log:
        await db.delete(log)
        await db.commit()


@router.get("/daily", response_model=DailyTotals)
async def get_daily_totals(
    data: date = Query(...),
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    goal = await _active_goal(db, target_id)
    return await _daily_totals(db, target_id, data, goal)


@router.get("/weekly", response_model=WeeklyConsolidated)
async def get_weekly_consolidated(
    semana_inicio: date = Query(...),
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)
    semana_fim = semana_inicio + timedelta(days=6)
    goal = await _active_goal(db, target_id)

    dias = [await _daily_totals(db, target_id, semana_inicio + timedelta(days=i), goal) for i in range(7)]
    dias_com_registro = [d for d in dias if d.refeicoes]
    n = len(dias_com_registro) or 1
    media_kcal = sum(d.kcal_total for d in dias_com_registro) / n
    media_proteina = sum(d.proteina_total for d in dias_com_registro) / n

    exercise_result = await db.execute(
        select(ExerciseLog).where(
            ExerciseLog.user_id == target_id,
            ExerciseLog.data >= semana_inicio,
            ExerciseLog.data <= semana_fim,
        )
    )
    exercicios = exercise_result.scalars().all()
    kcal_queimado_total = sum(float(e.kcal_estimado or 0) for e in exercicios)

    return WeeklyConsolidated(
        semana_inicio=semana_inicio,
        semana_fim=semana_fim,
        media_kcal_dia=round(media_kcal, 1),
        media_proteina_dia=round(media_proteina, 1),
        meta_kcal=goal.meta_kcal_dia if goal else None,
        meta_proteina=goal.meta_proteina_g_dia if goal else None,
        dias=dias,
        kcal_estimado_queimado_total=round(kcal_queimado_total, 1),
        treinos_realizados=len(exercicios),
    )
