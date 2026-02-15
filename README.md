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

## Production
```bash
npm run build
npm run start
```

## Environment
See `.env.example`:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_SOCKET`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `CACHE_TTL_SECONDS`
- `LOCAL_DB_PATH`

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
