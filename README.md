# OperBlock

Internal project management tool — rebranded from the original Replit "Project Manager" template.

## Stack

- **Frontend:** React 19, Vite 6, TypeScript, Tailwind CSS v4, React Router, TanStack Query, Clerk
- **Backend:** Express 5, Drizzle ORM, PostgreSQL, Clerk JWT auth
- **Design:** Inter font, shadcn-style HSL tokens, `REPLIT_APP_THEME_TOKENS` pattern

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Required for | Description |
|----------|--------------|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Auth (frontend) | Clerk publishable key |
| `CLERK_SECRET_KEY` | Auth (API) | Clerk secret key for JWT verification |
| `CLERK_PUBLISHABLE_KEY` | Auth (API) | Clerk publishable key (required by @clerk/express) |
| `DATABASE_URL` | Live data | PostgreSQL connection string |
| `APP_URL` | Redirects | Frontend URL (default `http://localhost:5173`) |
| `PORT` | API server | Backend port (default `3001`) |

### 3. Clerk setup (free tier)

#### Step 1 — Create a Clerk application

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) and sign up (free, no credit card).
2. Click **Create application**.
3. Name it **OperBlock** (or anything you like).
4. Choose sign-in methods — for an internal tool, **Email** + **Google** is a good default.
5. Click **Create application**.

#### Step 2 — Copy API keys into `.env`

In Clerk → **Configure** → **API keys**, copy:

| Clerk dashboard | Your `.env` variable |
|-----------------|----------------------|
| Publishable key (`pk_test_...`) | `VITE_CLERK_PUBLISHABLE_KEY` |
| Publishable key (same value) | `CLERK_PUBLISHABLE_KEY` |
| Secret key (`sk_test_...`) | `CLERK_SECRET_KEY` |

Your `.env` should look like:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxx
```

#### Step 3 — Configure redirect URLs

In Clerk → **Configure** → **Paths** (or **URLs**):

| Setting | Value |
|---------|-------|
| Sign-in URL | `/sign-in` |
| Sign-up URL | `/sign-up` |
| After sign-in URL | `/dashboard` |
| After sign-up URL | `/dashboard` |

In **Allowed redirect URLs**, add:

```
http://localhost:5173
http://localhost:5173/dashboard
http://localhost:5173/sign-in
http://localhost:5173/sign-up
```

#### Step 4 — (Optional) Restrict to your team

For an internal tool, in Clerk → **Configure** → **Restrictions**:

- **Allowlist** an email domain (e.g. `@yourcompany.com`), or
- Disable public sign-up and **invite users** from the Clerk dashboard.

### 4. PostgreSQL setup

#### Option A — Docker (recommended on Windows)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
npm run db:up          # start PostgreSQL container
npm run db:migrate     # create tables
npm run db:seed        # insert sample org, project, and tasks
```

The default `DATABASE_URL` in `.env.example` matches the Docker container:

```
postgresql://operblock:operblock@localhost:5432/operblock
```

Copy that into your `.env` if you use Docker.

#### Option B — Local PostgreSQL install

If you have PostgreSQL installed natively:

```bash
createdb operblock
```

Then set `DATABASE_URL` in `.env` to your connection string and run:

```bash
npm run db:migrate
npm run db:seed
```

If PostgreSQL is not available, the frontend falls back to mock Kanban data and the API returns `503` for database routes.

**Schema tables:** `organizations`, `projects`, `tasks`, `task_assignees`, `comments`

### 5. Verify setup

```bash
npm run setup:check
```

This confirms Clerk keys and PostgreSQL connectivity before you start the app.

### 6. Run the full stack

```bash
npm run dev
```

This starts both the Vite frontend (`http://localhost:5173`) and Express API (`http://localhost:3001`). Vite proxies `/api` requests to the backend.

Or run individually:

```bash
npm run dev:client   # frontend only
npm run dev:server   # backend only
```

## Routes

| Path | Page | Auth |
|------|------|------|
| `/` | Landing — OperBlock overview | Public |
| `/sign-in` | Clerk sign-in | Public |
| `/sign-up` | Clerk sign-up | Public |
| `/dashboard` | Kanban board (API + mock fallback) | Protected |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check + DB status |
| GET/POST | `/api/projects` | List / create projects |
| PATCH/DELETE | `/api/projects/:id` | Update / delete project |
| GET/POST | `/api/tasks` | List / create tasks |
| PATCH/DELETE | `/api/tasks/:id` | Update / delete task (status via PATCH) |
| GET | `/api/reports/summary?period=week\|month\|quarter\|year` | Period analytics (completions, throughput, breakdowns) |

All `/api/projects` and `/api/tasks` routes require a valid Clerk JWT (`Authorization: Bearer <token>`).

## Deploy

See **[DEPLOY.md](DEPLOY.md)** for Render deployment with Neon + Clerk.

Quick summary: one web service runs `npm run db:migrate && npm run build` then `NODE_ENV=production npm start`. Set `APP_URL` and Clerk redirect URLs to your live domain.

## Theme

CSS variables live in `src/index.css` (`:root` / `.dark`).  
`index.html` defines `window.REPLIT_APP_THEME_TOKENS` for Tailwind v4 color/font/radius mapping.

Font: **Inter** (400, 500, 600, 700) via Google Fonts.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:client` | Start Vite dev server only |
| `npm run dev:server` | Start Express API only |
| `npm run build` | Type-check and production build |
| `npm start` | Run production server (API + static frontend) |
| `npm run preview` | Preview production build |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:seed` | Insert sample org, project, and tasks |
| `npm run db:push` | Push schema directly to DB (dev) |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:up` | Start PostgreSQL via Docker |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run setup:check` | Verify Clerk keys and DB connection |

## Dev without backend services

The dashboard works without PostgreSQL:

- **No DB:** Kanban shows mock data; drag-and-drop updates UI optimistically but PATCH calls fail silently (reverts on error).
- **No Clerk:** Auth routes won't work until `VITE_CLERK_PUBLISHABLE_KEY` is set.
