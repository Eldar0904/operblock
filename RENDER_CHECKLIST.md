# Render deploy checklist (OperBlock)

Copy env values from your local `.env` into Render → **Environment** (never commit `.env`).

## 1. GitHub

Create a repo at https://github.com/new (name e.g. `operblock`), then:

```powershell
cd C:\Users\HP\Documents\Replit\OperBlock
git remote add origin https://github.com/YOUR_USERNAME/operblock.git
git push -u origin main
```

## 2. Render

1. https://dashboard.render.com → **New +** → **Blueprint** (uses `render.yaml`)  
   **or** **Web Service** → connect repo manually.
2. Instance: **Free** (or **Starter $7/mo** for always-on).
3. Add environment variables **before first deploy**:

| Key | Where to get it |
|-----|-----------------|
| `NODE_ENV` | `production` (also in render.yaml) |
| `DATABASE_URL` | Local `.env` (Neon) |
| `CLERK_SECRET_KEY` | Local `.env` |
| `CLERK_PUBLISHABLE_KEY` | Local `.env` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Same as publishable key |
| `APP_URL` | Leave empty first deploy; then set `https://YOUR-SERVICE.onrender.com` and redeploy |

## 3. After first deploy

1. Copy your Render URL (e.g. `https://operblock-xxxx.onrender.com`).
2. Set `APP_URL` in Render → **Manual Deploy**.
3. Clerk Dashboard → **Paths** / **Allowed redirect URLs** — add:
   - `https://YOUR-SERVICE.onrender.com`
   - `https://YOUR-SERVICE.onrender.com/dashboard`
   - `https://YOUR-SERVICE.onrender.com/sign-in`
   - `https://YOUR-SERVICE.onrender.com/sign-up`

## 4. Verify

- `https://YOUR-SERVICE.onrender.com/api/health` → `"ok": true, "db": true, "clerk": true`
- Sign in → dashboard loads with live tasks

See [DEPLOY.md](./DEPLOY.md) for full details.
