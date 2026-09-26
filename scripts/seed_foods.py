"""Loads backend/seed/foods.json into the `foods` table. No personal data here —
safe to run anywhere (local dev or the VPS) and safe to re-run (skips foods that
already exist by exact name).

Usage:
  cd backend && ../.venv/bin/python ../scripts/seed_foods.py
"""

import asyncio
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select  # noqa: E402

from app.database import async_session  # noqa: E402
from app.models import Food  # noqa: E402

FOODS_JSON = BACKEND_DIR / "seed" / "foods.json"


async def main() -> None:
    foods = json.loads(FOODS_JSON.read_text())
    added = 0
    async with async_session() as session:
        for entry in foods:
            exists = await session.execute(select(Food).where(Food.name == entry["name"]))
            if exists.scalar_one_or_none() is not None:
                continue
            session.add(Food(**entry))
            added += 1
        await session.commit()
    print(f"Done. {added} foods added ({len(foods)} in seed file).")


if __name__ == "__main__":
    asyncio.run(main())
