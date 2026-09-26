-- Team Fit — Postgres schema (self-hosted).
-- Two fixed people (Paulo, Bárbara), no per-user accounts — access is gated by a
-- single shared PIN at the application layer (see app/auth.py), not by row-level
-- ownership. All identifiers are in English; food names/categories and training
-- plan content are stored in Portuguese since that is what the app displays.

create extension if not exists "pgcrypto";

-- ============================================================
-- The two fixed people using the app
-- ============================================================
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('paulo', 'barbara')),
  name text not null,
  sex text,
  birth_date date,
  height_cm numeric(5,1),
  activity_level text, -- sedentary | light | moderate | intense | very_intense
  dietary_restrictions text[] not null default '{}',
  health_conditions text[] not null default '{}',
  medications text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Goals (weight/calorie/protein targets, versioned — only one active at a time)
-- ============================================================
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  goal_type text not null check (goal_type in ('lose_weight', 'gain_weight', 'maintain_weight')),
  target_weight_kg numeric(5,1),
  target_kcal_day integer,
  target_protein_g_day integer,
  start_date date not null default current_date,
  target_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_goals_person_active on goals(person_id, active);

-- ============================================================
-- Weight history
-- ============================================================
create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,1) not null,
  note text,
  created_at timestamptz not null default now(),
  unique(person_id, date)
);

-- ============================================================
-- Body measurements
-- ============================================================
create table if not exists body_measurements (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  date date not null,
  waist_cm numeric(5,1),
  hip_cm numeric(5,1),
  chest_cm numeric(5,1),
  arm_cm numeric(5,1),
  thigh_cm numeric(5,1),
  neck_cm numeric(5,1),
  other_measurements jsonb not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  unique(person_id, date)
);

-- ============================================================
-- Food reference table (nutrition per 100g) — drives the "Tabela de Alimentos"
-- screen and the automatic kcal/protein calculation when logging meals.
-- ============================================================
create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  kcal_per_100g numeric(6,1) not null,
  protein_per_100g numeric(5,1) not null default 0,
  carbs_per_100g numeric(5,1) not null default 0,
  fat_per_100g numeric(5,1) not null default 0,
  default_portion_g numeric(6,1),
  default_portion_label text,
  source text,
  created_at timestamptz not null default now()
);
create index if not exists idx_foods_name on foods(lower(name));

-- ============================================================
-- Meal logs — one row per meal, per day, per person
-- ============================================================
create table if not exists meal_logs (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  date date not null,
  meal_type text not null check (
    meal_type in ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'supper')
  ),
  time time,
  created_at timestamptz not null default now()
);
create index if not exists idx_meal_logs_person_date on meal_logs(person_id, date);

-- ============================================================
-- Meal log items — either a `foods` reference + quantity (kcal/protein computed
-- from the food's per-100g values) or a free-text item with manual kcal/protein
-- (e.g. a restaurant meal with no matching food in the table).
-- ============================================================
create table if not exists meal_log_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references meal_logs(id) on delete cascade,
  food_id uuid references foods(id) on delete set null,
  free_text_description text,
  quantity_g numeric(6,1),
  kcal numeric(6,1) not null default 0,
  protein_g numeric(6,1) not null default 0,
  created_at timestamptz not null default now(),
  check (food_id is not null or free_text_description is not null)
);
create index if not exists idx_meal_log_items_meal_log on meal_log_items(meal_log_id);

-- ============================================================
-- Training plans — versioned, manually written/edited (no AI generation).
-- Only the "consult" screen reads the active version; edits create a new
-- version and deactivate the previous one.
-- ============================================================
create table if not exists training_plans (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  version integer not null,
  title text not null,
  content text not null, -- markdown, in Portuguese
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_training_plans_person_active on training_plans(person_id, active);

-- NOTE: no Row Level Security — the app has no per-user identity, only a single
-- shared PIN gate enforced in the FastAPI layer (app/auth.py). Both people are
-- always fully accessible to whoever is signed into the app with the PIN.
