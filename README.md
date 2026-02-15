# FarmReactERP (Node.js + React + Bootstrap)

Clean web rebuild of FarmSuite that connects directly to the **main FarmSuite MySQL database** and uses a **local SQLite sync/cache database** for offline resilience.

## Stack
- Node.js + Express API
- React + Vite frontend
- Bootstrap 5 UI
- MySQL (`farmsuite`) as source of truth
- SQLite local cache/sync file: `server/data/farmreact_local_cache.sqlite`

## What This Build Implements
- Full React app (not WebView)
- Farm-aware auth and role handling
- Legacy URL parity for major FarmSuite pages:
  - `/broilers/*`, `/layers/*`, `/pigs/*`, `/crops/*`, `/aquaculture/*`
  - `/inventory/*`, `/finance/*`, `/sales`, `/reports/*`
  - `/hr-access/*`, `/messages`, `/notifications`, `/settings/*`
- Generic module CRUD across mapped FarmSuite tables
- Offline-safe write queue (outbox) when MySQL is unavailable
- Local structured entity snapshots for list/detail fallback
- Sync endpoints:
  - `POST /api/sync/run` (push queued writes)
  - `POST /api/sync/pull` (pull fresh snapshots from MySQL)
  - `GET /api/sync/status` (MySQL + outbox + local cache stats)

## Setup
```bash
cd /opt/lampp/htdocs/farmsuite/ReactNative
cp .env.example .env
npm run install:all
npm run parity:report
npm run dev
```

- API: `http://localhost:8080`
- React app: `http://localhost:5174`

## Production Build
```bash
npm run build
npm run start
```

## Docker
Build and run locally:
```bash
docker build -t farmsuite-app .
docker run -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=3306 \
  -e DB_NAME=farmsuite \
  -e DB_USER=root \
  -e DB_PASS="" \
  -e JWT_SECRET=your-secret-key \
  farmsuite-app
```

Or with docker-compose:
```bash
docker-compose up -d
```

## Deployment Options

### Railway.app (Recommended for simplicity)
1. Push to GitHub (already done)
2. Go to https://railway.app
3. Create new project → Connect GitHub repo
4. Railway auto-detects `railway.json` and builds/deploys
5. Add environment variables in dashboard:
   - `DB_HOST` (your MySQL host)
   - `DB_PORT` (3306)
   - `DB_NAME` (farmsuite)
   - `DB_USER` (your user)
   - `DB_PASS` (your password)
   - `JWT_SECRET` (generate random 32+ char string)

### Render.com
1. Push to GitHub
2. Go to https://render.com
3. Create new "Web Service"
4. Connect GitHub repo
5. Set build command: `npm run build`
6. Set start command: `npm start`
7. Add environment variables (same as Railway)

### Self-hosted Docker
1. Build image: `docker build -t farmsuite .`
2. Run container with appropriate env vars
3. Ensure MySQL from FarmSuite is accessible

## Environment Variables
See `.env.example`:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_SOCKET`
- `JWT_SECRET` (required, generate strong random string)
- `JWT_EXPIRES_IN` (default: 12h)
- `CACHE_TTL_SECONDS` (default: 45)
- `LOCAL_DB_PATH` (default: server/data/farmreact_local_cache.sqlite)
- `PORT` (default: 8080)

## Parity Analysis
Route parity report is generated to:
- `FEATURE_PARITY.md`

Run:
```bash
npm run parity:report
```

Route + API runtime parity smoke check (opens all legacy routes in headless Chromium and fails on frontend/API errors):
```bash
npm run parity:smoke
```

Optional overrides:
```bash
PARITY_BASE_URL=http://localhost:5174 PARITY_API_URL=http://localhost:8080 npm run parity:smoke
```
