"""One-time migration of the real Paulo/Bárbara data from data/*.json and
data/planos/musculacao/*.md into the self-hosted Postgres database.

The data/ directory is intentionally gitignored (it holds real health/medical
information) — this script only runs locally/on the VPS, reading files that
never go through git. See backend/seed/foods.json + scripts/seed_foods.py for
the food reference table, which IS committed (no personal data in it).

Usage:
  cd backend && ../.venv/bin/python ../scripts/seed_data.py

Safe to re-run: existing people/weight logs/measurements/training plans for a
given date (or the current active plan) are left untouched.
"""

import asyncio
import json
import sys
from datetime import date
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select  # noqa: E402

from app.database import async_session  # noqa: E402
from app.models import BodyMeasurement, Goal, Person, TrainingPlan, WeightLog  # noqa: E402

ACTIVITY_LEVEL_MAP = {
    "sedentário": "sedentary",
    "leve": "light",
    "moderado": "moderate",
    "intenso": "intense",
    "muito intenso": "very_intense",
}

# Initial goals aren't in the JSON profiles — carried over from the original
# nutrition plan targets.
INITIAL_GOALS = {
    "barbara": {"goal_type": "lose_weight", "target_weight_kg": 58, "target_kcal_day": 1350, "target_protein_g_day": 125},
    "paulo": {"goal_type": "lose_weight", "target_weight_kg": 85, "target_kcal_day": 2450, "target_protein_g_day": 185},
}


def _map_activity_level(raw: str | None) -> str | None:
    if not raw:
        return None
    return ACTIVITY_LEVEL_MAP.get(raw.strip().lower(), raw.strip().lower())


async def _upsert_person(session, slug: str, profile_json: Path) -> Person:
    raw = json.loads(profile_json.read_text())

    result = await session.execute(select(Person).where(Person.slug == slug))
    person = result.scalar_one_or_none()
    if person is None:
        person = Person(slug=slug, name=raw["nome"])
        session.add(person)

    person.name = raw["nome"]
    person.sex = raw.get("sexo")
    person.height_cm = raw.get("altura_cm")
    person.activity_level = _map_activity_level(raw.get("nivel_atividade_atual"))
    person.dietary_restrictions = raw.get("restricoes_alimentares", [])
    person.health_conditions = raw.get("condicoes_saude", [])
    person.medications = raw.get("medicamentos")
    person.notes = raw.get("observacoes")
    await session.flush()
    print(f"  person: {person.name} ({slug})")
    return person


async def _seed_goal(session, person: Person, slug: str) -> None:
    existing = await session.execute(select(Goal).where(Goal.person_id == person.id, Goal.active.is_(True)))
    if existing.scalar_one_or_none() is not None:
        return
    session.add(Goal(person_id=person.id, **INITIAL_GOALS[slug]))
    print(f"  goal created: {INITIAL_GOALS[slug]}")


async def _seed_weight_history(session, person: Person, raw: dict) -> None:
    entries = raw.get("historico_peso", [])
    added = 0
    for entry in entries:
        entry_date = date.fromisoformat(entry["data"])
        exists = await session.execute(
            select(WeightLog).where(WeightLog.person_id == person.id, WeightLog.date == entry_date)
        )
        if exists.scalar_one_or_none() is None:
            session.add(
                WeightLog(
                    person_id=person.id,
                    date=entry_date,
                    weight_kg=entry["peso_kg"],
                    note=entry.get("observacao"),
                )
            )
            added += 1
    print(f"  weight logs: {added} added ({len(entries)} in source)")


async def _seed_measurements(session, person: Person, raw: dict) -> None:
    entries = raw.get("medidas", {}).get("historico", [])
    added = 0
    for entry in entries:
        entry_date = date.fromisoformat(entry["data"])
        exists = await session.execute(
            select(BodyMeasurement).where(BodyMeasurement.person_id == person.id, BodyMeasurement.date == entry_date)
        )
        if exists.scalar_one_or_none() is None:
            session.add(
                BodyMeasurement(
                    person_id=person.id,
                    date=entry_date,
                    waist_cm=entry.get("cintura_cm"),
                    hip_cm=entry.get("quadril_cm"),
                    neck_cm=entry.get("pescoco_cm"),
                    note=entry.get("observacao"),
                )
            )
            added += 1
    print(f"  body measurements: {added} added ({len(entries)} in source)")


async def _seed_training_plan(session, person: Person, slug: str, name: str) -> None:
    plan_md = DATA_DIR / "planos" / "musculacao" / f"{slug}.md"
    if not plan_md.exists():
        return
    existing = await session.execute(
        select(TrainingPlan).where(TrainingPlan.person_id == person.id, TrainingPlan.active.is_(True))
    )
    if existing.scalar_one_or_none() is not None:
        return
    session.add(
        TrainingPlan(
            person_id=person.id,
            version=1,
            title=f"Plano de Musculação — {name}",
            content=plan_md.read_text(),
            active=True,
        )
    )
    print("  training plan seeded (version 1)")


async def main() -> None:
    async with async_session() as session:
        for slug in ("barbara", "paulo"):
            print(f"Seeding {slug}…")
            profile_json = DATA_DIR / "profiles" / f"{slug}.json"
            raw = json.loads(profile_json.read_text())

            person = await _upsert_person(session, slug, profile_json)
            await _seed_goal(session, person, slug)
            await _seed_weight_history(session, person, raw)
            await _seed_measurements(session, person, raw)
            await _seed_training_plan(session, person, slug, raw["nome"])
            await session.commit()

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
