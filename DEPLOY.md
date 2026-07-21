# Deploy OperBlock

OperBlock runs as **one web service**: Express serves the API (`/api/*`) and the Vite-built frontend (everything else). PostgreSQL stays on **Neon**; auth stays on **Clerk**.

## Recommended host: Render (free tier)

### 1. Push code to GitHub

Render deploys from a Git repository. If the project is not on GitHub yet:

```bash
git init
git add .
git commit -m "Prepare OperBlock for deployment"
git remote add origin https://github.com/YOUR_ORG/operblock.git
git push -u origin main
```

### 2. Create a Render Web Service

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Render can auto-detect settings from [`render.yaml`](render.yaml), or set manually:

| Setting | Value |
|---------|-------|
| **Build command** | `npm install && npm run db:migrate && npm run build` |
| **Start command** | `npm start` |
| **Instance type** | Free (or paid for always-on) |

### 3. Environment variables

Set these in Render → **Environment**:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your Neon connection string (same as local `.env`) |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `VITE_CLERK_PUBLISHABLE_KEY` | **Same** publishable key (needed at build time) |
| `APP_URL` | Your Render URL, e.g. `https://operblock.onrender.com` |

> **Important:** `VITE_CLERK_PUBLISHABLE_KEY` is baked into the frontend at build time. If you change it, trigger a **manual redeploy**.

Set `APP_URL` **after** the first deploy when you know the Render URL, then redeploy once.

### 4. Clerk production URLs

In [Clerk Dashboard](https://dashboard.clerk.com) → your app → **Configure** → **Paths** / **Domains**:

| Setting | Value |
|---------|-------|
| Home URL | `https://YOUR-APP.onrender.com` |
| Sign-in URL | `https://YOUR-APP.onrender.com/sign-in` |
| Sign-up URL | `https://YOUR-APP.onrender.com/sign-up` |
| After sign-in | `https://YOUR-APP.onrender.com/dashboard` |
| After sign-up | `https://YOUR-APP.onrender.com/dashboard` |

Under **Allowed redirect URLs**, add:

```
https://YOUR-APP.onrender.com
https://YOUR-APP.onrender.com/dashboard
https://YOUR-APP.onrender.com/sign-in
https://YOUR-APP.onrender.com/sign-up
```

For a real production launch, create a **Production** Clerk instance and use `pk_live_` / `sk_live_` keys instead of test keys.

### 5. Neon database

Your Neon `DATABASE_URL` works from Render without changes. Migrations run automatically in the build step (`npm run db:migrate`).

Optional: run seed once locally against Neon if you need sample data:

```bash
npm run db:seed
```

### 6. Deploy and verify

1. Click **Deploy** (or push to `main` for auto-deploy)
2. Wait for build to finish (~2–5 min)
3. Open `https://YOUR-APP.onrender.com/api/health` — expect:

```json
{ "ok": true, "db": true, "clerk": true, "mode": "production" }
```

4. Open the app root, sign in, confirm dashboard loads with live task UUIDs

---

## Test production build locally

```powershell
cd C:\Users\HP\Documents\Replit\OperBlock
$env:NODE_ENV="production"
npm run build
npm start
```

Open `http://localhost:3001` — frontend and API on the same port.

---

## Free tier notes (Render)

- Service **spins down after ~15 min** of inactivity; first visit may take 30–60 s to wake up
- Upgrade to a paid instance for always-on (better for a team tool)

---

## Railway (alternative)

Same one-service layout. Config lives in [`railway.toml`](railway.toml). Step-by-step: [`RAILWAY_CHECKLIST.md`](RAILWAY_CHECKLIST.md).

1. https://railway.com/new → **Deploy from GitHub repo** → `Eldar0904/operblock`
2. **Settings → Networking → Generate Domain**
3. Set the same environment variables as Render (`NODE_ENV`, `DATABASE_URL`, Clerk keys, `VITE_CLERK_PUBLISHABLE_KEY`)
4. After first deploy, set `APP_URL` to `https://YOUR-SERVICE.up.railway.app` and redeploy
5. Add that URL to Clerk allowed redirects / paths
6. Verify `https://YOUR-SERVICE.up.railway.app/api/health`

Railway injects `PORT` automatically; the server already reads `process.env.PORT`.

Build / start (from `railway.toml`):

```bash
npm install --include=dev && npm run db:migrate && npm run build
npm start
```

---

## Other hosts

Same `build` + `start` commands work on **Fly.io** or any Node host. Set the same environment variables and point Clerk / `APP_URL` to your live domain.

---

## Security checklist

- [ ] `.env` is not committed (already in `.gitignore`)
- [ ] Rotate Clerk/Neon keys if they were ever shared in chat
- [ ] Restrict Clerk sign-up to your team (domain allowlist or invites only)
- [ ] Use `pk_live_` / `sk_live_` keys for production Clerk instance
