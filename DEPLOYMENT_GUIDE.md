# FarmSuite Deployment Navigator

**Choose your deployment path:**

## 🚀 Express Path (Recommended) - 15 minutes

**Deploy to: Vercel Frontend + Railway Backend + Railway Database**

👉 **[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)** ⭐ START HERE

### Why This?
- ✅ Verified & tested
- ✅ Free tier available
- ✅ No code changes needed
- ✅ Auto-scaling included
- ✅ Simple environment setup

### What You Get
- Frontend on Vercel.app (React + Vite)
- Backend API on Railway.app (Node.js)
- Database on Railway (MySQL, free tier: $5 credit)
- Auto CI/CD on every git push

---

## 🔧 Alternative Paths

### Option 1: Vercel Complete
**Vercel Frontend + Vercel Serverless Backend + Supabase PostgreSQL**

👉 [VERCEL_SETUP.md](./VERCEL_SETUP.md)

Pros: Single platform (Vercel), everything integrated
Cons: Requires refactoring, PostgreSQL not MySQL, slower cold starts

### Option 2: Railway Complete  
**All services on Railway (Frontend, Backend, Database)**

Steps:
1. Follow [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) to deploy backend
2. Deploy frontend to Railway instead of Vercel
3. Same database setup

Pros: Single platform, consistent interface
Cons: Less free tier than Vercel

### Option 3: Self-Hosted Docker
**Deploy to your own server or VPS**

👉 [DEPLOYMENT.md](./DEPLOYMENT.md) - Docker section

Pros: Full control, lowest cost (own server)
Cons: You manage infrastructure

### Option 4: Local Development Only

👉 [README.md](./README.md) - Setup section

Pros: No deployment costs
Cons: Only works on your machine

---

## 📊 Decision Matrix

| Option | Time | Cost | Setup | Scaling | Recommended? |
|--------|------|------|-------|---------|--------------|
| **Express** (Vercel+Railway) | 15 min | $0-5/mo | Easy | Auto | ⭐⭐⭐ |
| Vercel Only | 30 min | $0-35/mo | Hard | Auto | ⭐⭐ |
| Railway Only | 20 min | $0-10/mo | Medium | Auto | ⭐⭐ |
| Self-Hosted | 60+ min | Varies | Hard | Manual | ⭐ |
| Local Only | 5 min | $0 | Easy | None | Dev only |

---

## 🎯 Choose by Your Goal

### "I want it live TODAY"
→ **[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)** (15 min)

### "I want one platform for everything"
→ **[VERCEL_SETUP.md](./VERCEL_SETUP.md)** or Railway Complete

### "I want lowest cost"
→ **[DEPLOYMENT.md](./DEPLOYMENT.md)** Docker on VPS

### "I just want to develop locally"
→ `npm run dev:server` + `npm run dev:client`

### "I want production with custom domain"
→ **[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)** then add domain

---

## 📖 Documentation Index

### Quick Start
- `README.md` - Overview & setup
- `SETUP_QUICK.md` - Database migration quick reference

### Deployment Guides
- `PRODUCTION_SETUP.md` ⭐ **START HERE** - Vercel + Railway
- `VERCEL_SETUP.md` - Vercel-only approach
- `DEPLOYMENT.md` - Docker & architecture
- `DATABASE_MIGRATION.md` - Database setup details

### Configuration
- `.env.example` - Local development defaults
- `.env.railway` - Railway credentials template
- `.env.production` - Production reference
- `.credentials.example` - Credentials storage template

### Setup & Automation
- `scripts/migrate-db.sh` - Database export
- `setup-db-quick.sh` - Quick setup
- `setup-db-auto.sh` - Full auto-setup
- `import-railway.sh` - Database import tool

### Checklists
- `SETUP_COMPLETE.md` - Auto-setup completion guide
- `PRODUCTION_SETUP.md` - Deployment checklist

---

## ✅ Three-Step Summary

### Step 1: Create Remote Database
```bash
# Go to https://railway.app
# New Project → Provision → Database → MySQL
# Copy credentials to .env.railway
```

### Step 2: Deploy Backend
```bash
# Railway auto-detects railway.json
# Add .env vars in Railway dashboard
# Deploy!
git push origin main
```

### Step 3: Deploy Frontend
```bash
# Go to https://vercel.com
# Import GitHub repo
# Add VITE_API_URL env var
# Deploy!
```

**Result**: Live production app in ~15 minutes! 🚀

---

## 🔗 Platform Links

- **Vercel**: https://vercel.com
- **Railway**: https://railway.app
- **GitHub**: https://github.com/jacobphiri/farmsuite
- **Repository Settings**: GitHub → Settings → Pages

---

## 💬 Need Help?

1. **Deployment failing?** → Check `DATABASE_MIGRATION.md` troubleshooting
2. **Confused about options?** → Read this file again
3. **Want details?** → See the relevant documentation file
4. **Have questions?** → Check docs or GitHub issues

---

## 🎯 Next Action

**👉 [Read PRODUCTION_SETUP.md Now!](./PRODUCTION_SETUP.md)**

It's the fastest way to get your app live. Everything else is here if you need it.

Good luck! 🚀
