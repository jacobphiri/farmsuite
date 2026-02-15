# Vercel Complete Setup Guide

Deploy your entire FarmSuite app to Vercel with Supabase database.

## ✅ What You'll Get

- **Frontend** on Vercel.app (React + Vite)
- **Backend API** on Vercel Functions (Node.js serverless)
- **Database** on Supabase (free PostgreSQL)
- **Auto CI/CD** - Deploy on every commit

## Architecture

```
GitHub Commit
    ↓
Vercel Auto-Deploy
    ├─→ Build React frontend
    ├─→ Deploy serverless functions
    └─→ API connects to Supabase
        ↓
    Supabase PostgreSQL
```

## Step 1: Create Supabase Database (Free!)

### 1. Create Account
- Go to https://supabase.com
- Sign in with GitHub
- Create new project
- Get credentials:
  - **Project URL** (e.g., `https://xxx.supabase.co`)
  - **Anon Key**
  - **Service Role Key**

### 2. Get Connection String
In Supabase dashboard: Settings → Database → URI
```
postgres://postgres:password@db.xxx.supabase.co:5432/postgres
```

## Step 2: Prepare Your App for Vercel

### Update Environment Variables

Create `.env.vercel`:
```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
DATABASE_URL=postgres://postgres:password@...

# Server
PORT=3000
NODE_ENV=production

# JWT
JWT_SECRET=your-random-32-char-secret
JWT_EXPIRES_IN=12h
```

## Step 3: Deploy to Vercel

### 1. Go to Vercel
- https://vercel.com
- Sign in with GitHub
- Click "Add New" → "Project"
- Import `jacobphiri/farmsuite` repo
- Select `ReactNative` root directory

### 2. Configure Build
- **Framework**: Vite
- **Build Command**: `npm --prefix client run build`
- **Output Directory**: `client/dist`
- **Install Command**: `npm install`

### 3. Set Environment Variables
In Vercel dashboard, add from `.env.vercel`:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=12h
```

### 4. Deploy
Click **Deploy** and wait 5-10 minutes

## Step 4: Configure API routing

Backend runs via Vercel Functions at `/api/*`

Update client to use Vercel URLs:
```javascript
// client/src/api/client.js
const apiUrl = import.meta.env.VITE_API_URL || '/api';
```

## Step 5: Verify Deployment

1. Visit your Vercel URL
2. Test login
3. Create a record
4. Check Supabase for new data

## Database Schema

Supabase requires your FarmSuite schema. You have two options:

### Option A: Automatic (Recommended)
Use migration tools (requires schema redesign for PostgreSQL)

### Option B: Manual
In Supabase SQL Editor, create tables from FarmSuite schema

## Limitations of This Approach

- **Vercel Functions**: Cold starts (slower initially)
- **PostgreSQL**: Different SQL than MySQL (minor adjustments needed)
- **Pricing**: Free tier has limits (see below)

## Pricing & Limits

### Vercel
- Free tier: 100GB bandwidth/month, 12 function invocations/sec
- Good for: Low-to-medium traffic

### Supabase
- Free tier: 500MB database, 2GB bandwidth
- Good for: Development and small production apps

## Alternative: Keep Railway Setup (Recommended)

The proven setup is:
- **Frontend**: Vercel
- **Backend**: Railway
- **Database**: Railway MySQL

This avoids refactoring and works great. See `SETUP_COMPLETE.md` for that approach.

## Troubleshooting

### "Cannot connect to database"
- Check Supabase connection string
- Verify DATABASE_URL in Vercel env vars
- Check Supabase project is running

### "API returns 500"
- Check Vercel function logs: dashboard → function name → logs
- Verify Supabase credentials

### "Deploy keeps failing"
- Check build logs: "Deployments" → failed deploy → "Logs"
- Ensure `npm run build` works locally

## Next Steps

1. Choose your platform (this guide assumes Vercel only)
2. Quick start with Railway approach (see `SETUP_COMPLETE.md`)
3. If you want Vercel completely, use Supabase (this guide)
4. Contact support if issues arise

---

**Recommendation**: Use Vercel Frontend + Railway Backend (proven & stable)
This guide shows Vercel-only option (more complex but single platform)

See `SETUP_COMPLETE.md` for the recommended production setup.
