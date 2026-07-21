# Railway deploy checklist (OperBlock)

Copy env values from your local `.env` into Railway → **Variables** (never commit `.env`).

## 1. GitHub

Repo should already be at https://github.com/Eldar0904/operblock. If you add Railway config locally, push `main` first:

```powershell
cd C:\Users\Pine\Documents\PINE\operblock
git add railway.toml RAILWAY_CHECKLIST.md DEPLOY.md README.md .env.example
git commit -m "Add Railway deployment config"
git push origin main
```

## 2. Create the Railway service

1. Open https://railway.com/new  
2. **Deploy from GitHub repo** → select `Eldar0904/operblock`  
3. Railway reads [`railway.toml`](railway.toml) for build/start/healthcheck  
4. Open the service → **Settings** → **Networking** → **Generate Domain**

## 3. Environment variables

Add these under the service → **Variables** (before or right after first deploy):

| Key | Where to get it |
|-----|-----------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon **direct** (non-pooler) URL preferred for migrations — host often looks like `ep-….neon.tech`, not `-pooler` |
| `CLERK_SECRET_KEY` | Local `.env` |
| `CLERK_PUBLISHABLE_KEY` | Local `.env` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Same as publishable key (needed at **build** time) |
| `APP_URL` | Leave empty first deploy; then set `https://YOUR-SERVICE.up.railway.app` and redeploy |

> Railway sets `PORT` automatically — do not hardcode it.

If you change `VITE_CLERK_PUBLISHABLE_KEY`, trigger a **Redeploy** so the frontend rebuilds.

## 4. After first deploy

1. Copy your public URL from **Settings → Networking**.  
2. Set `APP_URL` to that URL → **Redeploy**.  
3. Clerk Dashboard → **Paths** / **Allowed redirect URLs** — add:
   - `https://YOUR-SERVICE.up.railway.app`
   - `https://YOUR-SERVICE.up.railway.app/dashboard`
   - `https://YOUR-SERVICE.up.railway.app/sign-in`
   - `https://YOUR-SERVICE.up.railway.app/sign-up`

## 5. Verify

- `https://YOUR-SERVICE.up.railway.app/api/health` → `"ok": true, "db": true, "clerk": true`
- Sign in → dashboard loads with live tasks

See [DEPLOY.md](./DEPLOY.md) for full details.
