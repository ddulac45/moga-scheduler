# MOGA Scheduler — Mission Control

Manchester OB/GYN Associates physician scheduling system.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite) |
| Backend / DB | Supabase (Postgres + Auth + RLS) |
| Hosting | Vercel |
| Local dev | Vite dev server → Supabase cloud or local |

## Project structure

```
moga-scheduler/
├── src/
│   ├── App.jsx                  ← root; router + auth gate
│   ├── main.jsx                 ← Vite entry
│   ├── config/
│   │   └── supabase.js          ← createClient (env vars)
│   ├── hooks/
│   │   ├── useSupabaseData.js   ← load / save all persistent state
│   │   └── useAuth.js           ← session + role resolution
│   ├── lib/
│   │   ├── scheduler.js         ← pure scheduling engine (no React)
│   │   ├── helpers.js           ← date utils, csv, formatting
│   │   └── defaults.js          ← DEFAULT_PHYSICIANS, PERM_NO_CALL, etc.
│   └── components/
│       ├── SchedulerApp.jsx     ← main app shell (was the monolith)
│       ├── AuthGate.jsx         ← login screen
│       └── ...                  ← split out incrementally
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── docs/
│   └── ARCHITECTURE.md
├── .env.local                   ← never committed — see .env.example
├── .env.example
├── vite.config.js
└── package.json
```

## Local development

```bash
# 1. Install deps
npm install

# 2. Copy env template and fill in your Supabase project credentials
cp .env.example .env.local

# 3. Start dev server
npm run dev
# → http://localhost:5173

# 4. The app falls back to window.storage (artifact mode) if Supabase
#    env vars are missing — so the Claude artifact version still works
#    unchanged during development.
```

## Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (safe to expose) |

Both are `VITE_` prefixed so Vite injects them at build time.

## Deployment (Vercel)

1. Push repo to GitHub
2. Import into Vercel — zero config needed for Vite
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel → Settings → Environment Variables
4. Deploy

## Auth model (current: simple)

Two roles enforced via Supabase Row Level Security:

- **admin** — full read/write on all tables
- **viewer** — read-only on `schedule`, `physicians`, `pto_list`

Role is stored in `profiles.role`. The `useAuth` hook exposes `{ user, role, isAdmin }`.

To add per-physician login later: add `profiles.physician_id FK → physicians.id`
and tighten RLS policies to `auth.uid() = physician_id`. No app-level changes needed.

## Data persistence strategy

The app uses a **dual-storage** pattern so local testing never requires Supabase:

```
┌─────────────────────────────────────┐
│  useSupabaseData hook               │
│                                     │
│  if (SUPABASE env vars present)     │
│    → read/write Supabase tables     │
│  else                               │
│    → fall back to window.storage    │
│       (artifact / offline mode)     │
└─────────────────────────────────────┘
```

This means:
- The Claude artifact version works exactly as before (no regressions)
- Vercel production uses Supabase
- You can test Supabase locally by setting `.env.local`
