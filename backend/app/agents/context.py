import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.health_indices import compute_health_indices
from app.models import (
    AdherenceNote,
    AppUser,
    BodyMeasurement,
    FamilyMember,
    Goal,
    MealPlan,
    Profile,
    TrainingPlan,
    WeightLog,
)


def _calcular_idade(data_nascimento: date) -> int:
    hoje = date.today()
    idade = hoje.year - data_nascimento.year
    if (hoje.month, hoje.day) < (data_nascimento.month, data_nascimento.day):
        idade -= 1
    return idade


async def _profile_summary(db: AsyncSession, user: AppUser | None, user_id: uuid.UUID) -> list[str]:
    profile = (await db.execute(select(Profile).where(Profile.user_id == user_id))).scalar_one_or_none()
    goal = (await db.execute(select(Goal).where(Goal.user_id == user_id, Goal.ativo.is_(True)))).scalars().first()
    weights = (
        await db.execute(select(WeightLog).where(WeightLog.user_id == user_id).order_by(WeightLog.data.desc()).limit(3))
    ).scalars().all()
    measurements = (
        await db.execute(
            select(BodyMeasurement).where(BodyMeasurement.user_id == user_id).order_by(BodyMeasurement.data)
        )
    ).scalars().all()
    all_weights = (
        await db.execute(select(WeightLog).where(WeightLog.user_id == user_id).order_by(WeightLog.data))
    ).scalars().all()

    lines = [f"Nome: {user.full_name if user else 'desconhecido'}"]
    if profile is None:
        lines.append("Perfil ainda não preenchido — peça para o usuário preencher a tela de Perfil antes de avaliar.")
        return lines

    idade = f"{_calcular_idade(profile.data_nascimento)} anos" if profile.data_nascimento else "—"
    lines.append(
        f"Sexo: {profile.sexo or '—'} | Idade: {idade} | Altura: {profile.altura_cm or '—'}cm | "
        f"Nível de atividade: {profile.nivel_atividade or '—'}"
    )
    if profile.restricoes_alimentares:
        lines.append(f"Restrições alimentares: {', '.join(profile.restricoes_alimentares)}")
    if profile.condicoes_saude:
        lines.append(f"Condições de saúde: {', '.join(profile.condicoes_saude)}")
    if profile.medicamentos:
        lines.append(f"Medicamentos: {profile.medicamentos}")
    if profile.observacoes:
        lines.append(f"Observações do perfil: {profile.observacoes}")

    if goal:
        lines.append(
            f"Meta ativa: {goal.tipo}, peso alvo={goal.peso_meta_kg or '—'}kg, "
            f"kcal/dia={goal.meta_kcal_dia or '—'}, proteína/dia={goal.meta_proteina_g_dia or '—'}g"
        )
    else:
        lines.append("Ainda não há meta nutricional definida.")

    if weights:
        historico = ", ".join(f"{w.data}: {w.peso_kg}kg" for w in reversed(weights))
        lines.append(f"Últimas pesagens: {historico}")

    indices = compute_health_indices(
        altura_cm=float(profile.altura_cm) if profile.altura_cm else None,
        sexo=profile.sexo,
        weight_logs=all_weights,
        measurements=measurements,
    )
    if indices.imc_atual:
        lines.append(f"IMC atual: {indices.imc_atual} ({indices.imc_classificacao})")
    if indices.rcq_atual:
        lines.append(f"RCQ atual: {indices.rcq_atual} ({indices.rcq_classificacao})")
    if indices.rca_atual:
        lines.append(f"RCA atual: {indices.rca_atual} ({indices.rca_classificacao})")

    return lines


async def build_user_context(db: AsyncSession, user_id: uuid.UUID, agente: str = "orquestrador") -> str:
    user = (await db.execute(select(AppUser).where(AppUser.id == user_id))).scalar_one_or_none()

    lines = ["--- Perfil do usuário ---"]
    lines += await _profile_summary(db, user, user_id)

    meal_plan = (
        await db.execute(select(MealPlan).where(MealPlan.user_id == user_id, MealPlan.ativo.is_(True)))
    ).scalars().first()
    lines.append("")
    lines.append("--- Plano alimentar ativo ---")
    if meal_plan:
        lines.append(f"{meal_plan.titulo} (versão {meal_plan.versao})")
        lines.append(meal_plan.conteudo)
    else:
        lines.append("Nenhum plano alimentar ativo ainda.")

    training_plan = (
        await db.execute(select(TrainingPlan).where(TrainingPlan.user_id == user_id, TrainingPlan.ativo.is_(True)))
    ).scalars().first()
    lines.append("")
    lines.append("--- Plano de treino ativo ---")
    if training_plan:
        lines.append(f"{training_plan.titulo} (versão {training_plan.versao})")
        lines.append(training_plan.conteudo)
    else:
        lines.append("Nenhum plano de treino ativo ainda.")

    if agente in ("nutricionista", "personal", "orquestrador"):
        notes = (
            await db.execute(
                select(AdherenceNote).where(AdherenceNote.user_id == user_id).order_by(AdherenceNote.criado_em.desc()).limit(8)
            )
        ).scalars().all()
        if notes:
            lines.append("")
            lines.append("--- Últimas dificuldades/observações relatadas ---")
            for note in reversed(notes):
                lines.append(f"[{note.criado_em.date()}] ({note.agente}) {note.nota}")

    if agente == "chef":
        membership = (
            await db.execute(select(FamilyMember).where(FamilyMember.user_id == user_id))
        ).scalar_one_or_none()
        if membership:
            other_members = (
                await db.execute(
                    select(FamilyMember).where(
                        FamilyMember.family_id == membership.family_id,
                        FamilyMember.user_id != user_id,
                    )
                )
            ).scalars().all()
            if other_members:
                lines.append("")
                lines.append("--- Este usuário faz parte de um grupo familiar que janta junto ---")
                lines.append(
                    "Ao criar o cardápio semanal, leve em conta os planos alimentares de TODOS os membros abaixo "
                    "e monte um cardápio único para a família, com as quantidades em gramas individualizadas por pessoa."
                )
                for member in other_members:
                    other_user = (
                        await db.execute(select(AppUser).where(AppUser.id == member.user_id))
                    ).scalar_one_or_none()
                    other_plan = (
                        await db.execute(
                            select(MealPlan).where(MealPlan.user_id == member.user_id, MealPlan.ativo.is_(True))
                        )
                    ).scalars().first()
                    lines.append("")
                    lines.append(f"Plano de {other_user.full_name if other_user else 'outro membro'}:")
                    lines.append(other_plan.conteudo if other_plan else "(sem plano alimentar ainda)")

    return "\n".join(lines)
