# Team Fit

App web multiusuário de acompanhamento de saúde, nutrição e treino — chat com agentes de IA (nutricionista, personal trainer, chef), planos alimentares versionados, cardápio semanal, registro de refeições e exercícios, calculadora de calorias e dashboards de evolução.

- **Backend:** FastAPI (Python) + Postgres (Supabase) + Anthropic API
- **Frontend:** Next.js (TypeScript) + Tailwind + Supabase Auth
- **Hospedagem:** Render (backend) + Vercel (frontend) + Supabase (banco + auth)

## Papéis de usuário

- **admin**: vê e edita os dados de todos os usuários (seleciona no menu no topo do app).
- **invited**: vê apenas os próprios dados. Só é criado por convite de um admin (tela **Administração**).

---

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, rode o conteúdo de [`backend/sql/schema.sql`](backend/sql/schema.sql).
3. Em **Project Settings → API**, anote:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend — **nunca** exponha no frontend)
4. Em **Project Settings → API → JWT Settings**, copie o `JWT Secret` → `SUPABASE_JWT_SECRET`.
5. Em **Project Settings → Database**, copie a connection string (modo *Session*, com senha) e monte:
   `postgresql+asyncpg://postgres:<senha>@<host>:5432/postgres` → `DATABASE_URL`.
6. Em **Authentication → URL Configuration**, defina o **Site URL** para a URL do frontend em produção (Vercel) e adicione `.../convite` como *Redirect URL* — é a página que trata o link de convite.

## 2. Criar o primeiro admin

Não existe cadastro público — o primeiro usuário é criado direto no Supabase:

1. Em **Authentication → Users**, clique em **Invite user** com seu e-mail (ex: o e-mail que você já usa hoje). Isso cria o usuário no Supabase Auth e envia o e-mail de convite.
2. Copie o `id` (UUID) do usuário criado.
3. No **SQL Editor**, rode:
   ```sql
   insert into app_users (id, email, full_name, role)
   values ('<uuid-copiado>', 'seu-email@exemplo.com', 'Seu Nome', 'admin');
   ```
4. Abra o e-mail de convite, defina sua senha na página `/convite` do app e faça login normalmente. A partir daí, novos usuários são convidados pela própria tela **Administração** do app (isso já cria a linha em `app_users` automaticamente).

## 3. Migrar os dados existentes (opcional)

Se quiser levar o histórico já registrado (perfis, pesagens, plano alimentar) de Bárbara e Paulo para o novo banco:

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # preencha com as credenciais reais do Supabase/Anthropic
python3 ../scripts/migrate_seed_data.py --barbara-email barbara@exemplo.com --paulo-email paulo@exemplo.com
```

Veja o cabeçalho de [`scripts/migrate_seed_data.py`](scripts/migrate_seed_data.py) para detalhes do que é migrado.

## 4. Rodar localmente

**Backend:**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # preencha com as credenciais do Supabase e a GEMINI_API_KEY
uvicorn app.main:app --reload
```
API disponível em `http://localhost:8000` (docs em `/docs`).

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local   # preencha SUPABASE_URL/ANON_KEY e NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```
App disponível em `http://localhost:3000`.

## 5. Deploy em produção

**Backend (Render):**
1. Crie um novo *Blueprint* no Render apontando para este repositório — ele detecta [`render.yaml`](render.yaml) automaticamente (serviço `teamfit-backend`, raiz em `backend/`).
2. Preencha as env vars marcadas como `sync: false` no dashboard do Render: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY` (opcional), `FRONTEND_ORIGINS` (URL do Vercel, ex: `https://teamfit.vercel.app`).
3. Depois do deploy, anote a URL pública (ex: `https://teamfit-backend.onrender.com`).

**Frontend (Vercel):**
1. Importe o repositório no Vercel e defina **Root Directory** = `frontend`.
2. Configure as env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` (a URL do Render).
3. Deploy. Depois, volte no backend do Render e ajuste `FRONTEND_ORIGINS` para a URL final do Vercel (evita bloqueio de CORS).
4. No Supabase, atualize **Authentication → URL Configuration** com a URL final do Vercel.

## 6. Configurar e-mails com Resend (opcional)

O app manda 3 tipos de e-mail. **Convite** e **redefinição de senha** são gerados e enviados pelo próprio
Supabase Auth (ele já cuida do token/link com segurança) — você só troca *quem entrega* o e-mail, trocando o
provedor SMTP padrão do Supabase pelo Resend:

1. Crie uma conta em [resend.com](https://resend.com) e um domínio verificado em **Domains** (o Resend te dá os
   registros DKIM/SPF pra adicionar no DNS do seu domínio). Sem domínio verificado só dá pra mandar e-mail de
   teste pra você mesmo.
2. Gere uma API key em **API Keys**.
3. No painel do Supabase: **Authentication → Emails → SMTP Settings**, ative "Enable Custom SMTP" e preencha:
   - Host: `smtp.resend.com`
   - Porta: `587`
   - Usuário: `resend`
   - Senha: sua API key do Resend
   - Sender email: algo do seu domínio verificado (ex: `equipe@seudominio.com`)
4. (Opcional) Ainda em **Authentication → Emails**, customize os templates de convite e redefinição de senha.

O **e-mail de boas-vindas** (disparado quando uma conta é criada — convite ou primeiro login local) é diferente:
o Supabase não tem esse gatilho nativo, então o próprio backend chama a API do Resend direto
([`backend/app/email_client.py`](backend/app/email_client.py)). Para ativar, preencha no `.env` do backend:

```
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=Team Fit <equipe@seudominio.com>
```

Sem `RESEND_API_KEY` configurada, o e-mail de boas-vindas é só pulado (fica um log) — nada quebra.

---

## Estrutura do projeto

```
backend/            FastAPI — API REST + agentes de IA (Anthropic)
  app/
    routers/         endpoints por domínio (perfil, metas, refeições, chat, dashboard…)
    agents/          prompts e chamada ao Claude (nutricionista, personal, chef)
    models.py         modelos SQLAlchemy
    schemas.py        schemas Pydantic
  sql/schema.sql      schema Postgres para rodar no Supabase
frontend/            Next.js — app web (mobile + desktop)
  src/app/(app)/      páginas autenticadas: dashboard, perfil, plano alimentar, cardápio,
                      registro de refeições/treinos, chat, calculadora, administração
scripts/             script de migração dos dados antigos (JSON/Markdown) para o Postgres
data/                dados originais (perfis, planos) — mantidos apenas como referência/migração
```

## Funcionalidades

- Chat com 3 agentes de IA (nutricionista, personal trainer, chef) com contexto do perfil/meta do usuário
- Múltiplos perfis, com admin vendo todos e convidado vendo só o próprio
- Plano alimentar versionado com histórico
- Cardápio semanal
- Registro de peso e medidas corporais (dashboards de evolução)
- Meta de peso e calorias/proteína por objetivo (perder/ganhar/manter)
- Calculadora de calorias (TMB/GET, Mifflin-St Jeor)
- Registro diário de refeições com total de kcal/proteína comparado à meta
- Consolidado semanal para ajustar os próximos dias
- Registro de exercícios com estimativa de queima calórica (MET)
