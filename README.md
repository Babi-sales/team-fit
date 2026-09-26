# Team Fit

A small self-hosted app for tracking meals, weight, body measurements and a
training plan for two people. Built for personal/household use — no accounts,
just a shared PIN.

- **Backend:** FastAPI (Python) + Postgres
- **Frontend:** Next.js (TypeScript) + Tailwind
- **Hosting:** self-hosted via Docker Compose + Caddy (single VPS)

The codebase (schema, code, comments, docs) is in English. The app's UI text
and the food reference data are in Portuguese, since that's what the two
people using it read day to day.

## Features

- Meal logging per day, per person — pick foods from a nutrition reference
  table and the app computes kcal/protein automatically from quantity, or
  enter a one-off item manually (e.g. a restaurant meal)
- Dashboard: daily calories vs. goal, weight over time, body measurements over
  time, BMI/waist-hip-ratio/waist-height-ratio
- Editable food reference table (kcal/protein/carbs/fat per 100g)
- Training plan — manually written/edited (markdown), versioned; the app only
  displays it, it does not generate or adjust training on its own
- Weight/measurement logging and a simple goal (target weight/kcal/protein)

## A note on the `data/` directory

`data/` holds real personal health data (weight history, medical conditions,
medications) for the two people using this app. It is **gitignored on
purpose** and must never be committed — this repo is public. If you're
adapting this project for yourself, keep your own real data out of git the
same way; only `backend/seed/foods.json` (nutrition reference data, no
personal information) is committed.

## Project structure

```
backend/            FastAPI — REST API
  app/
    routers/         one file per resource (people, goals, weight, foods, meal-logs, ...)
    models.py         SQLAlchemy models
    schemas.py         Pydantic schemas
    auth.py            shared-PIN session auth (no per-user accounts)
  sql/schema.sql       Postgres schema
  seed/foods.json      nutrition reference data (committed — no personal data)
frontend/            Next.js app (mobile + desktop)
  src/app/(app)/       authenticated pages: dashboard, log, foods, training, profile
scripts/             one-time seed scripts (read data/, which is gitignored)
data/                real personal data — gitignored, never committed
```

## 1. Local development

**Postgres** (only needed once — use Docker or a local install):

```bash
docker run -d --name teamfit-db -e POSTGRES_USER=teamfit -e POSTGRES_PASSWORD=teamfit \
  -e POSTGRES_DB=teamfit -p 5432:5432 -v teamfit_db_data:/var/lib/postgresql/data postgres:16
psql postgresql://teamfit:teamfit@localhost:5432/teamfit -f backend/sql/schema.sql
```

**Backend:**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL/APP_PIN/SESSION_SECRET
uvicorn app.main:app --reload
```

API available at `http://localhost:8000` (docs at `/docs`).

**Seed data** (foods table + your own real data from `data/`, if present):

```bash
cd backend
../.venv/bin/python ../scripts/seed_foods.py
../.venv/bin/python ../scripts/seed_data.py   # only if data/ is populated
```

**Frontend:**

```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

App available at `http://localhost:3000`.

## 2. Deploy to a VPS (Docker Compose + Caddy)

Everything — Postgres, backend, frontend, and a Caddy reverse proxy with
automatic HTTPS — runs via a single `docker-compose.yml`, behind one domain.

1. Point your domain's DNS A record at the VPS IP.
2. Clone this repo on the VPS.
3. Create the real `.env` **on the server** (never in git):
   ```bash
   cp .env.example .env
   # fill in DOMAIN, POSTGRES_PASSWORD, APP_PIN, SESSION_SECRET
   ```
4. Start everything:
   ```bash
   docker compose up -d --build
   ```
   The `db` service auto-applies `backend/sql/schema.sql` on first boot (empty
   volume only).
5. Seed the data. The `db` service publishes Postgres on `127.0.0.1:5432`
   (host-only, not exposed to the internet) specifically so you can run the
   seed scripts from the VPS itself, the same way as in local dev:
   ```bash
   cd backend
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   export DATABASE_URL=postgresql+asyncpg://teamfit:<POSTGRES_PASSWORD from .env>@localhost:5432/teamfit
   python ../scripts/seed_foods.py   # food reference table — safe to re-run, no personal data
   python ../scripts/seed_data.py    # only if you copied your own data/ to the VPS (never via git)
   ```
6. Visit `https://<your-domain>` — Caddy provisions the TLS certificate
   automatically on first request.

**Updating after a code change:**

```bash
git pull
docker compose up -d --build
```

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | Postgres connection string |
| `APP_PIN` | backend | shared PIN that gates the app |
| `SESSION_SECRET` | backend | signs the session cookie |
| `FRONTEND_ORIGINS` | backend | CORS allowlist (comma-separated) |
| `NEXT_PUBLIC_API_URL` | frontend (build-time) | backend base URL the browser calls |
| `DOMAIN` / `POSTGRES_PASSWORD` / `APP_PIN` / `SESSION_SECRET` | root `.env` (docker-compose) | fills in the above for the full stack |
