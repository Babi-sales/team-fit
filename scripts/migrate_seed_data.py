"""Migra os dados existentes (Bárbara e Paulo) de data/*.json e data/planos/*.md
para o novo schema Postgres/Supabase.

Pré-requisitos:
  1. Rodar backend/sql/schema.sql no seu projeto Supabase.
  2. Preencher backend/.env com as credenciais reais do Supabase.
  3. Convidar/confirmar os e-mails reais de Bárbara e Paulo (o script envia o
     convite via Supabase Auth e cria a linha em app_users).

Uso:
  cd backend && ../.venv/bin/python ../scripts/migrate_seed_data.py \
      --barbara-email barbara@exemplo.com \
      --paulo-email paulo@exemplo.com

Bárbara é cadastrada como admin (vê os dados de todos); Paulo como convidado
(vê apenas os próprios dados). Ajuste os papéis depois pela tela de Administração
se preferir o contrário.

Observação: os planos de musculação (data/planos/musculacao/*.md) não têm uma
tabela dedicada no schema atual — cole o conteúdo relevante no chat com o
personal trainer se quiser que o agente use esse histórico como contexto.
"""

import argparse
import asyncio
import json
import sys
import uuid
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select  # noqa: E402

from app.database import async_session  # noqa: E402
from app.models import (  # noqa: E402
    AppUser,
    BodyMeasurement,
    Goal,
    MealPlan,
    Profile,
    WeeklyMenu,
    WeightLog,
)
from app.supabase_admin import invite_user_by_email  # noqa: E402

PESSOAS = {
    "barbara": {
        "json": DATA_DIR / "profiles" / "barbara.json",
        "plano_md": DATA_DIR / "planos" / "alimentar" / "barbara.md",
        "role": "admin",
        "kcal_alvo": 1350,
        "proteina_alvo_g": 125,
        "peso_meta_kg": 58,
    },
    "paulo": {
        "json": DATA_DIR / "profiles" / "paulo.json",
        "plano_md": DATA_DIR / "planos" / "alimentar" / "paulo.md",
        "role": "invited",
        "kcal_alvo": 2450,
        "proteina_alvo_g": 185,
        "peso_meta_kg": 85,
    },
}


async def upsert_person(session, key: str, email: str, cfg: dict) -> None:
    raw = json.loads(cfg["json"].read_text())
    full_name = raw["nome"]

    existing = await session.execute(select(AppUser).where(AppUser.email == email))
    user = existing.scalar_one_or_none()
    if user is None:
        supabase_user = await invite_user_by_email(email)
        user = AppUser(id=uuid.UUID(supabase_user["id"]), email=email, full_name=full_name, role=cfg["role"])
        session.add(user)
        await session.flush()
        print(f"  convite enviado e usuário criado: {full_name} <{email}>")
    else:
        print(f"  usuário já existia: {full_name} <{email}>")

    profile_result = await session.execute(select(Profile).where(Profile.user_id == user.id))
    profile = profile_result.scalar_one_or_none()
    condicoes = raw.get("condicoes_saude", [])
    restricoes = raw.get("restricoes_alimentares", [])
    if profile is None:
        profile = Profile(
            user_id=user.id,
            sexo=raw.get("sexo"),
            altura_cm=raw.get("altura_cm"),
            nivel_atividade="sedentario",
            restricoes_alimentares=restricoes,
            condicoes_saude=condicoes,
            medicamentos=raw.get("medicamentos"),
            observacoes=raw.get("observacoes"),
        )
        session.add(profile)
    else:
        profile.sexo = raw.get("sexo")
        profile.altura_cm = raw.get("altura_cm")
        profile.restricoes_alimentares = restricoes
        profile.condicoes_saude = condicoes
        profile.medicamentos = raw.get("medicamentos")
        profile.observacoes = raw.get("observacoes")

    goal_result = await session.execute(select(Goal).where(Goal.user_id == user.id, Goal.ativo.is_(True)))
    if goal_result.scalar_one_or_none() is None:
        session.add(
            Goal(
                user_id=user.id,
                tipo="perder_peso",
                peso_meta_kg=cfg["peso_meta_kg"],
                meta_kcal_dia=cfg["kcal_alvo"],
                meta_proteina_g_dia=cfg["proteina_alvo_g"],
            )
        )
        print(f"  meta criada: perder peso até {cfg['peso_meta_kg']}kg, {cfg['kcal_alvo']}kcal/dia")

    for entry in raw.get("historico_peso", []):
        exists = await session.execute(
            select(WeightLog).where(WeightLog.user_id == user.id, WeightLog.data == entry["data"])
        )
        if exists.scalar_one_or_none() is None:
            session.add(
                WeightLog(
                    user_id=user.id,
                    data=entry["data"],
                    peso_kg=entry["peso_kg"],
                    observacao=entry.get("observacao"),
                )
            )
    print(f"  {len(raw.get('historico_peso', []))} pesagens migradas")

    medidas_hist = raw.get("medidas", {}).get("historico", [])
    for entry in medidas_hist:
        exists = await session.execute(
            select(BodyMeasurement).where(BodyMeasurement.user_id == user.id, BodyMeasurement.data == entry["data"])
        )
        if exists.scalar_one_or_none() is None:
            session.add(
                BodyMeasurement(
                    user_id=user.id,
                    data=entry["data"],
                    cintura_cm=entry.get("cintura_cm"),
                    quadril_cm=entry.get("quadril_cm"),
                    observacao=entry.get("observacao"),
                )
            )
    if medidas_hist:
        print(f"  {len(medidas_hist)} medidas corporais migradas")

    plano_md = cfg["plano_md"]
    if plano_md.exists():
        conteudo = plano_md.read_text()
        existing_plan = await session.execute(
            select(MealPlan).where(MealPlan.user_id == user.id, MealPlan.ativo.is_(True))
        )
        if existing_plan.scalar_one_or_none() is None:
            session.add(
                MealPlan(
                    user_id=user.id,
                    versao=1,
                    titulo=f"Plano alimentar — {full_name}",
                    conteudo=conteudo,
                    kcal_alvo=cfg["kcal_alvo"],
                    proteina_alvo_g=cfg["proteina_alvo_g"],
                    ativo=True,
                )
            )
            print("  plano alimentar migrado (versão 1)")

    await session.commit()


async def migrate_weekly_menu(session, semana_arquivo: Path, semana_inicio: str) -> None:
    if not semana_arquivo.exists():
        return
    conteudo = semana_arquivo.read_text()
    result = await session.execute(select(AppUser))
    for user in result.scalars().all():
        exists = await session.execute(
            select(WeeklyMenu).where(WeeklyMenu.user_id == user.id, WeeklyMenu.semana_inicio == semana_inicio)
        )
        if exists.scalar_one_or_none() is None:
            session.add(WeeklyMenu(user_id=user.id, semana_inicio=semana_inicio, conteudo=conteudo, ativo=True))
    await session.commit()
    print(f"cardápio de {semana_arquivo.name} migrado para semana de {semana_inicio}")


async def main(barbara_email: str, paulo_email: str) -> None:
    async with async_session() as session:
        for key, email in (("barbara", barbara_email), ("paulo", paulo_email)):
            print(f"Migrando {key}…")
            await upsert_person(session, key, email, PESSOAS[key])

        # Ajuste as datas abaixo se as semanas reais forem diferentes.
        await migrate_weekly_menu(
            session, DATA_DIR / "planos" / "cardapios" / "semana_02.md", "2026-08-10"
        )

    print("Migração concluída.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--barbara-email", required=True)
    parser.add_argument("--paulo-email", required=True)
    args = parser.parse_args()
    asyncio.run(main(args.barbara_email, args.paulo_email))
