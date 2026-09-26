import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user, resolve_target_user_id
from app.database import get_db
from app.health_indices import compute_health_indices
from app.models import BodyMeasurement, ExerciseLog, Goal, MealLog, Profile, WeightLog
from app.schemas import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardSummary)
async def get_dashboard(
    user_id: uuid.UUID | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = resolve_target_user_id(user_id, current_user)

    profile_result = await db.execute(select(Profile).where(Profile.user_id == target_id))
    profile = profile_result.scalar_one_or_none()

    weight_result = await db.execute(select(WeightLog).where(WeightLog.user_id == target_id).order_by(WeightLog.data))
    historico_peso = weight_result.scalars().all()

    measurements_result = await db.execute(
        select(BodyMeasurement).where(BodyMeasurement.user_id == target_id).order_by(BodyMeasurement.data)
    )
    historico_medidas = measurements_result.scalars().all()

    indices = compute_health_indices(
        altura_cm=float(profile.altura_cm) if profile and profile.altura_cm else None,
        sexo=profile.sexo if profile else None,
        weight_logs=historico_peso,
        measurements=historico_medidas,
    )

    goal_result = await db.execute(select(Goal).where(Goal.user_id == target_id, Goal.ativo.is_(True)))
    goal = goal_result.scalars().first()

    hoje = date.today()
    inicio_semana = hoje - timedelta(days=hoje.weekday())
    fim_semana = inicio_semana + timedelta(days=6)

    exercise_result = await db.execute(
        select(ExerciseLog).where(
            ExerciseLog.user_id == target_id,
            ExerciseLog.data >= inicio_semana,
            ExerciseLog.data <= fim_semana,
        )
    )
    exercicios_semana = exercise_result.scalars().all()

    meal_result = await db.execute(
        select(MealLog).where(
            MealLog.user_id == target_id,
            MealLog.data >= inicio_semana,
            MealLog.data <= fim_semana,
        )
    )
    refeicoes_semana = meal_result.scalars().all()
    dias_com_registro = {log.data for log in refeicoes_semana} or {hoje}
    n_dias = len(dias_com_registro)
    media_kcal = sum(float(r.kcal) for r in refeicoes_semana) / n_dias
    media_proteina = sum(float(r.proteina_g) for r in refeicoes_semana) / n_dias

    peso_atual = float(historico_peso[-1].peso_kg) if historico_peso else None
    peso_inicial = float(historico_peso[0].peso_kg) if historico_peso else None

    return DashboardSummary(
        peso_atual_kg=peso_atual,
        peso_inicial_kg=peso_inicial,
        peso_meta_kg=float(goal.peso_meta_kg) if goal and goal.peso_meta_kg else None,
        variacao_peso_kg=round(peso_atual - peso_inicial, 1) if peso_atual and peso_inicial else None,
        historico_peso=historico_peso,
        historico_medidas=historico_medidas,
        frequencia_exercicio_semana=len(exercicios_semana),
        kcal_estimado_queimado_semana=round(sum(float(e.kcal_estimado or 0) for e in exercicios_semana), 1),
        media_kcal_dia_semana=round(media_kcal, 1),
        media_proteina_dia_semana=round(media_proteina, 1),
        meta_kcal=goal.meta_kcal_dia if goal else None,
        meta_proteina=goal.meta_proteina_g_dia if goal else None,
        indices=indices,
    )
