# OperBlock

**OperBlock** is PINE’s internal operations task tool — Daily work for the team, longer-term projects, goals, and lightweight reporting. Built for a small high-performance team (seat cap: 6 users).

Repo: [Eldar0904/operblock](https://github.com/Eldar0904/operblock)

---

## What it does

| Area | Behavior |
|------|----------|
| **Daily** | Shared board with **General** (Inbox + Collaborations), **person tabs**, **Paused** / **Canceled**. Complete by **drag-and-drop** Open ↔ Done. Own-tab rules: complete / edit / delete only where you’re allowed. |
| **Projects** | Multi-project hub, portfolios in the sidebar, Kanban / list / timeline / overview. Optional **private** projects (creator-only contents). Creator manages pause/cancel/delete. |
| **My Tasks** | Tasks assigned to you across Daily and projects. |
| **Goals** | Objectives linked to projects; progress from completed tasks. |
| **Reports** | Period analytics with Daily vs projects velocity split. |
| **Attachments** | Files on tasks via **Cloudflare R2** (bytes) + **Neon** (metadata). Attach in the task modal, including while creating. |
| **Auth** | **Clerk** (email / OAuth). RU / KK UI via i18n. |

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS v4, React Router 7, TanStack Query, Clerk React, i18next |
| Backend | Express 5, Drizzle ORM, `postgres`, Clerk Express JWT |
| Data | **Neon** PostgreSQL (metadata & app data) |
| Files | **Cloudflare R2** (S3-compatible), private bucket `operblock-files` |
| Auth | **Clerk** |
| Deploy | One Node service on **Railway** (or Render): migrate → build → `npm start` |

---

## Architecture

```text
Browser (Vite / React)
    │  /api/*  (Clerk Bearer JWT)
    ▼
Express (server/index.ts)
    ├── Neon  — projects, tasks, comments, goals, attachment rows
    └── R2    — file bytes (tasks/<taskId>/<uuid>-name)
```

Production: Express also serves `dist/` (SPA). Locally: Vite on `:5173` proxies `/api` → Express `:3001`.

---

## Repository layout

```text
operblock/
├── src/                    # React app
│   ├── components/         # UI (Daily board, TaskModal, board, etc.)
│   ├── pages/dashboard/    # Overview, Daily/Projects, Goals, Reports…
│   ├── hooks/              # React Query + Clerk token helpers
│   ├── i18n/               # ru / kk locales
│   └── lib/                # api client, task helpers
├── server/
│   ├── index.ts            # Express app + static hosting
│   ├── routes/             # projects, tasks, attachments, …
│   ├── lib/                # task-service, r2, …
│   ├── middleware/         # Clerk auth
│   └── db/                 # Drizzle schema + migrations
├── scripts/                # migrate, setup:check
├── DEPLOY.md               # Production deploy notes
├── RAILWAY_CHECKLIST.md    # Railway env & steps
├── CHANGELOG.md            # Product change log
└── .env.example            # All env vars (no secrets)
```

---

## Getting started

### Requirements

- Node.js **≥ 20**
- Clerk application
- PostgreSQL (Docker local, or Neon for cloud)
- Optional locally: R2 credentials (attachments return 503 without them)

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend (build-time) | Clerk publishable key |
| `CLERK_PUBLISHABLE_KEY` | Server | Same publishable key for `@clerk/express` |
| `CLERK_SECRET_KEY` | Server | JWT verification |
| `DATABASE_URL` | Server | Postgres / Neon connection string |
| `APP_URL` | Server | CORS / app origin (e.g. `http://localhost:5173`) |
| `PORT` | Server | Default `3001` (Railway sets this) |
| `R2_ACCOUNT_ID` | Server | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | Server | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | Server | R2 API token secret |
| `R2_BUCKET` | Server | `operblock-files` |
| `R2_ENDPOINT` | Server | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (**no** bucket path suffix) |

Never expose R2 or Clerk secrets as `VITE_*`.

### 3. Clerk

1. Create an app at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Copy publishable + secret keys into `.env` (see table above).
3. Paths: sign-in `/sign-in`, sign-up `/sign-up`, after sign-in/up → `/dashboard`.
4. Allowed redirects: `http://localhost:5173` and the `/dashboard`, `/sign-in`, `/sign-up` variants.
5. For production, add your Railway URL the same way.
6. Optional: restrict sign-up (domain allowlist / invites). Team is capped at **6** users in-app.

### 4. Database

**Docker (local):**

```bash
npm run db:up
npm run db:migrate
npm run db:seed   # optional sample data
```

Default URL: `postgresql://operblock:operblock@localhost:5432/operblock`

**Neon (production / shared):** set `DATABASE_URL` to the Neon connection string, then `npm run db:migrate`.

### 5. R2 (attachments)

1. Bucket `operblock-files` (private — no public access).
2. **Manage R2 API Tokens** → Account API token → Object Read & Write on that bucket.
3. Put the five `R2_*` vars in `.env` / Railway.

### 6. Verify & run

```bash
npm run setup:check
npm run dev
```

- App: http://localhost:5173  
- API health: http://localhost:3001/api/health  

---

## App routes

| Path | Description | Auth |
|------|-------------|------|
| `/` | Landing (PINE / OperBlock) | Public |
| `/sign-in`, `/sign-up` | Clerk | Public |
| `/dashboard` | Momentum overview | Protected |
| `/dashboard/daily` | Daily board | Protected |
| `/dashboard/projects` | Projects hub | Protected |
| `/dashboard/projects/:id` | Single project (board, list, …) | Protected |
| `/dashboard/my-tasks` | Assigned to you | Protected |
| `/dashboard/goals` | Goals | Protected |
| `/dashboard/reports` | Reports | Protected |
| `/dashboard/settings` | Settings | Protected |

---

## API (overview)

All mutating/data routes expect `Authorization: Bearer <Clerk JWT>` when Clerk is configured.

| Area | Endpoints (prefix `/api`) |
|------|---------------------------|
| Health | `GET /health` |
| Projects | `GET/POST /projects`, `GET /projects/daily`, `GET /projects/all`, `PATCH/DELETE /projects/:id` |
| Tasks | `GET/POST /tasks`, `PATCH/DELETE /tasks/:id` |
| Comments | `GET/POST /tasks/:taskId/comments`, `DELETE /comments/:id` |
| Attachments | `GET/POST /tasks/:taskId/attachments`, `GET /attachments/:id/download`, `DELETE /attachments/:id` |
| Portfolios | CRUD under `/portfolios` |
| Goals | CRUD under `/goals` |
| Members | `GET /members` (list + seat capacity) |
| Reports | `GET /reports/summary?period=…` |

---

## Permissions (product rules)

- **Daily — person tab:** only that person (you on your tab) can complete / edit / delete those tasks.
- **Daily — General:** inbox (unassigned) editable by team; collaborations by participants.
- **Projects:** team can work tasks unless **private** — then only the creator opens/edits contents; creator also owns project pause/cancel/delete/privacy toggle.
- **Attachments:** same view/mutate rules as the parent task.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Client + server |
| `npm run build` | `tsc` + Vite production build |
| `npm start` | Production server (API + static) |
| `npm run db:migrate` | Apply Drizzle SQL migrations |
| `npm run db:seed` | Sample data |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:up` / `db:down` | Docker Postgres |
| `npm run setup:check` | Clerk + DB sanity check |

---

## Deploy (Railway)

See **[RAILWAY_CHECKLIST.md](RAILWAY_CHECKLIST.md)** and **[DEPLOY.md](DEPLOY.md)**.

1. Connect GitHub `main`; Railway runs migrate + build from `railway.toml`.
2. Set: `NODE_ENV`, `DATABASE_URL`, Clerk keys, `VITE_CLERK_PUBLISHABLE_KEY`, `APP_URL`, and all five `R2_*`.
3. Generate domain → set `APP_URL` → add Clerk redirects → redeploy.
4. Check `/api/health` → `"ok": true`, `"db": true`, `"clerk": true`.

Render is also supported via `render.yaml` / `RENDER_CHECKLIST.md`.

---

## Related docs

- **[CHANGELOG.md](CHANGELOG.md)** — dated log of product changes  
- **[DEPLOY.md](DEPLOY.md)** — production deploy detail  
- **[RAILWAY_CHECKLIST.md](RAILWAY_CHECKLIST.md)** — Railway variables & steps  
- **[.env.example](.env.example)** — env template  

---

## License / audience

Internal tool for **PINE**. Not published as a public SaaS product.
