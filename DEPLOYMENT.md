# Deployment Architecture

## Frontend & Backend Separation

This project separates frontend and backend for independent deployment:

### Frontend (React + Vite)
- Deployed to: **Vercel**, Netlify, or any static hosting
- Location: `/client` folder
- Build output: `/client/dist`
- Environment variable: `VITE_API_URL` (points to backend API)

### Backend (Node.js + Express)
- Deployed to: **Railway.app**, Render.com, Heroku, or any Node.js host
- Location: `/server` folder
- Serves: REST API + serves frontend on `/`
- Exposes port: `8080` (configurable)

## Deployment Scenarios

### Scenario 1: Vercel (Frontend) + Railway (Backend) - RECOMMENDED
**Best for**: Maximum flexibility and ease of use

```
┌─────────────────┐         ┌──────────────────┐
│   Vercel.app    │────────▶│   Railway.app    │
│   (React UI)    │ API     │  (Node.js API)   │
└─────────────────┘         └──────────────────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │  MySQL       │
                            │  (FarmSuite) │
                            └──────────────┘
```

**Setup:**
- Frontend on Vercel with `VITE_API_URL=https://your-railway-api.com`
- Backend on Railway with database credentials

### Scenario 2: Vercel (Full-stack with Serverless Functions)
**Best for**: Single deployment, but more complex

Uses `/api` folder as serverless functions (advanced).

### Scenario 3: Self-hosted Docker
**Best for**: Full control, on-premises

Single container with both frontend and backend:
```bash
docker-compose up -d
```
Runs at `http://localhost:8080`

## Database Options

### Option 1: Local MySQL (Development)
- Runs on your machine
- Use socket connection: `/opt/lampp/var/mysql/mysql.sock`
- No costs
- Good for: Local development

### Option 2: Railway MySQL (Production - FREE)
- Cloud-hosted, no setup needed
- Free tier includes ~500MB storage
- Best for: Production apps
- [See: DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md)

Steps:
1. Create Railway account
2. Provision MySQL database
3. Export local database: `./scripts/migrate-db.sh`
4. Import to Railway
5. Update env vars with Railway credentials

### Option 3: PlanetScale (MySQL-Compatible)
- Alternative to Railway
- Generous free tier
- Non-standard port (3306)

## Environment Variables

### Backend (.env) - Local Development
```env
PORT=8080
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=farmsuite
DB_USER=root
DB_PASS=
DB_SOCKET=/opt/lampp/var/mysql/mysql.sock
JWT_SECRET=your-long-random-secret-key
JWT_EXPIRES_IN=12h
CACHE_TTL_SECONDS=45
LOCAL_DB_PATH=server/data/farmreact_local_cache.sqlite
```

### Backend (.env) - Railway Production
```env
PORT=8080
DB_HOST=container-xxx.railway.app
DB_PORT=6543
DB_NAME=railway
DB_USER=root
DB_PASS=your-railway-password
DB_SOCKET=
JWT_SECRET=generate-strong-random-secret
JWT_EXPIRES_IN=12h
CACHE_TTL_SECONDS=45
LOCAL_DB_PATH=server/data/farmreact_local_cache.sqlite
```

### Frontend (Vercel Environment Variables)
```
VITE_API_URL=https://your-backend-api.railway.app
```

## Database Migration

See [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md) for detailed instructions on:
- Exporting local FarmSuite database
- Importing to Railway
- Verifying migration success
- Troubleshooting connection issues

## Quick Start

### Local Development
```bash
# Terminal 1: Backend
cd ReactNative
cp .env.example .env
npm install
npm run dev:server

# Terminal 2: Frontend
npm run dev:client
```

Access at:
- Frontend: http://localhost:5174
- Backend API: http://localhost:8080

### Deploy to Vercel (Frontend Only)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Go to Vercel**
   - Sign in to https://vercel.app
   - Click "Add New..." → "Project"
   - Import your GitHub repo
   - Select `ReactNative` as root directory
   - Framework: Vite
   - Build command: `npm --prefix client run build`
   - Output directory: `client/dist`

3. **Add Environment Variables**
   - Click "Environment Variables"
   - Add `VITE_API_URL` = your backend API URL (e.g., https://railway-app.onrender.com)

4. **Deploy**
   - Click "Deploy"

### Deploy to Railway (Backend)

See [Railway.app Deployment](./README.md#railwayapp-recommended-for-simplicity)

## Build Optimization

### Frontend Bundle Size
Current size: ~600KB → 160KB gzipped

To optimize further:
1. Enable code splitting: `npm run build -- --rollupOptions.output.manualChunks`
2. Use dynamic imports for large components
3. Lazy load route components

### Database Connection Pooling
Backend uses connection pooling for MySQL to handle concurrent requests.

## Monitoring & Debugging

### Vercel Deployment Logs
```bash
vercel logs --follow
```

### Backend Logs
```bash
# Railway
railway logs --follow

# Local
npm run dev:server
```

### Check API Health
```bash
curl https://your-api.com/api/system/health
```

## Database Access

The backend requires live MySQL access. For Vercel deployment:
1. Ensure your MySQL is accessible from Railway's IP
2. Use environment variables for credentials
3. Or use MySQL-as-a-Service (AWS RDS, DigitalOcean)

## Rollback & Updates

### Vercel
- Auto-rollback to previous deployment from dashboard
- Each push to `main` triggers auto-deployment

### Railway
- Similarly supports rollback
- Set auto-deploy on GitHub push

## Security

- Never commit `.env` files
- Use strong `JWT_SECRET` (32+ chars, random)
- Database credentials should be environment variables only
- Enable HTTPS (automatic on Vercel/Railway)
