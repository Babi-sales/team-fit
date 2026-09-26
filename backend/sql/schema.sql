-- Team Fit — schema Postgres (Supabase)
-- Rode este arquivo no SQL Editor do seu projeto Supabase.
-- app_users.id referencia auth.users(id) (tabela criada automaticamente pelo Supabase Auth).

create extension if not exists "pgcrypto";

-- ============================================================
-- Usuários da aplicação (role fica aqui, não no Supabase Auth)
-- ============================================================
create table if not exists app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('admin', 'invited')) default 'invited',
  created_at timestamptz not null default now()
);

-- ============================================================
-- Perfil de saúde
-- ============================================================
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references app_users(id) on delete cascade,
  sexo text,
  data_nascimento date,
  altura_cm numeric(5,1),
  nivel_atividade text, -- sedentario | leve | moderado | intenso | muito_intenso
  restricoes_alimentares text[] default '{}',
  condicoes_saude text[] default '{}',
  medicamentos text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Metas (objetivo do usuário: perder/ganhar peso, alvo de kcal/proteína)
-- ============================================================
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  tipo text not null check (tipo in ('perder_peso', 'ganhar_peso', 'manter_peso')),
  peso_meta_kg numeric(5,1),
  meta_kcal_dia integer,
  meta_proteina_g_dia integer,
  data_inicio date not null default current_date,
  data_alvo date,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_goals_user_ativo on goals(user_id, ativo);

-- ============================================================
-- Histórico de peso
-- ============================================================
create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  data date not null,
  peso_kg numeric(5,1) not null,
  observacao text,
  created_at timestamptz not null default now(),
  unique(user_id, data)
);

-- ============================================================
-- Medidas corporais
-- ============================================================
create table if not exists body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  data date not null,
  cintura_cm numeric(5,1),
  quadril_cm numeric(5,1),
  peito_cm numeric(5,1),
  braco_cm numeric(5,1),
  coxa_cm numeric(5,1),
  outras_medidas jsonb default '{}',
  observacao text,
  created_at timestamptz not null default now(),
  unique(user_id, data)
);

-- ============================================================
-- Plano alimentar (versionado, com histórico)
-- ============================================================
create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  versao integer not null,
  titulo text not null,
  conteudo text not null, -- markdown
  kcal_alvo integer,
  proteina_alvo_g integer,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists idx_meal_plans_user on meal_plans(user_id, ativo);

-- ============================================================
-- Plano de treino (versionado, com histórico) — criado pelo Personal Trainer
-- ============================================================
create table if not exists training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  versao integer not null,
  titulo text not null,
  conteudo text not null, -- markdown
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists idx_training_plans_user on training_plans(user_id, ativo);

-- ============================================================
-- Cardápio semanal
-- ============================================================
create table if not exists weekly_menus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  semana_inicio date not null,
  conteudo text not null, -- markdown
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique(user_id, semana_inicio)
);

-- ============================================================
-- Registro diário de refeições (kcal / proteína)
-- ============================================================
create table if not exists meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  data date not null,
  horario time,
  refeicao text not null, -- cafe_da_manha | lanche_manha | almoco | lanche_tarde | jantar | ceia
  descricao text not null,
  kcal numeric(6,1) not null default 0,
  proteina_g numeric(6,1) not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists idx_meal_logs_user_data on meal_logs(user_id, data);

-- ============================================================
-- Registro de exercícios (frequência + estimativa de queima calórica)
-- ============================================================
create table if not exists exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  data date not null,
  tipo_exercicio text not null, -- musculacao | caminhada | corrida | outro
  duracao_min integer not null,
  intensidade text not null default 'moderada', -- leve | moderada | intensa
  kcal_estimado numeric(6,1),
  observacao text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_exercise_logs_user_data on exercise_logs(user_id, data);

-- ============================================================
-- Histórico de chat com os agentes
-- ============================================================
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  agente text not null default 'orquestrador', -- nutricionista | personal | chef | orquestrador
  role text not null check (role in ('user', 'assistant')),
  conteudo text not null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_chat_messages_user on chat_messages(user_id, criado_em);

-- ============================================================
-- Anotações dos agentes (dificuldades relatadas no chat)
-- ============================================================
create table if not exists adherence_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  agente text not null,
  nota text not null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_adherence_notes_user on adherence_notes(user_id, criado_em);

-- ============================================================
-- Grupo familiar
-- ============================================================
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_por uuid not null references app_users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid not null unique references app_users(id) on delete cascade,
  papel text not null check (papel in ('chefe', 'membro')) default 'membro',
  entrou_em timestamptz not null default now()
);
create index if not exists idx_family_members_family on family_members(family_id);

-- NOTE: este schema não usa Row Level Security porque todo acesso ao banco
-- passa pelo backend FastAPI (autenticado via JWT do Supabase, autorização
-- feita em código). A service_role key do Supabase é usada apenas no
-- backend e NUNCA deve ser exposta ao frontend.
