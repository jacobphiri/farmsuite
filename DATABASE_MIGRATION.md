# Database Migration to Railway

Railway offers a free tier with cloud-hosted databases. Follow these steps to migrate your FarmSuite database.

## Option 1: Railway Database (Recommended - Easiest)

### Step 1: Create Railway Account & Database

1. Go to https://railway.app
2. Sign in with GitHub
3. Create new project
4. From the dashboard, click "Provision New" → "Database" → "MySQL"
5. Railway creates a MySQL instance automatically
6. Click on the database to view credentials

### Step 2: Get Connection Details

In the Railway dashboard, find these under "Connect":
- **Host**: `container-xxx.railway.app` (or similar)
- **Port**: Usually `xxxx` (non-standard port)
- **Username**: `root`
- **Password**: (auto-generated, shown in dashboard)
- **Database**: `railway` (default, or create new)

Copy these values.

### Step 3: Export Your Current Database

**On your local machine:**

```bash
# Using LAMPP MySQL
/opt/lampp/bin/mysqldump -u root --socket=/opt/lampp/var/mysql/mysql.sock farmsuite > backup.sql

# Or using system MySQL if available
mysqldump -u root -p farmsuite > backup.sql
```

This creates `backup.sql` file with your entire database schema + data.

### Step 4: Import to Railway Database

**Method A: Using MySQL Client**

```bash
# Import the backup to Railway
mysql -h container-xxx.railway.app -P xxxx -u root -p < backup.sql

# When prompted for password, enter Railway's password
```

**Method B: Using Docker Container**

```bash
docker run --rm \
  -v $(pwd)/backup.sql:/backup.sql \
  mysql:8 \
  mysql -h container-xxx.railway.app -P xxxx -u root -p[PASSWORD] < /backup.sql
```

Replace `[PASSWORD]` with actual password, `container-xxx.railway.app` with your host, `xxxx` with port.

### Step 5: Update Your Environment Variables

**For Backend (.env)**
```env
DB_HOST=container-xxx.railway.app
DB_PORT=xxxx
DB_NAME=railway
DB_USER=root
DB_PASS=your-railway-password
DB_SOCKET=  # Leave empty for remote connection
```

**For Vercel Frontend**
- No changes needed - backend handles database

### Step 6: Test Connection

Before deploying, test locally:

```bash
cd /opt/lampp/htdocs/farmsuite/ReactNative
npm run dev:server

# Check server logs:
# Should show: "Database connected" or similar success message
```

## Option 2: Alternative Free Databases

### PlanetScale (MySQL-Compatible)
- Go to https://planetscale.com
- Sign in with GitHub
- Create new database → get connection string
- Connection format: `mysql://[USERNAME]:[PASSWORD]@[HOST]/[DATABASE]?sslMode=VERIFY_IDENTITY`
- **Pros**: True free tier, very reliable
- **Cons**: MySQL over non-standard port

### Supabase (PostgreSQL)
- Go to https://supabase.com
- Create new project
- **Warning**: Requires changing code (PostgreSQL != MySQL)
- Not recommended for this migration

### Railway vs Competitors

| Feature | Railway | PlanetScale | Supabase |
|---------|---------|------------|----------|
| MySQL | ✅ Yes | ✅ Yes | ❌ (PostgreSQL) |
| Free Tier | ✅ Limited | ✅ Generous | ✅ Limited |
| Setup Time | ~10 min | ~10 min | ~15 min (migration) |
| Code Changes | ❌ None | ❌ None | ⚠️ Many (SQL dialect) |

## Step-by-Step Railway Database Setup

### 1. In Railway Dashboard

1. Create new project
2. Click "Provision New" at the top
3. Select "Database" 
4. Choose "MySQL"
5. Wait for provisioning (1-2 min)

### 2. Get Credentials

Click on the MySQL database box:
- View in "Connect" tab
- You should see:
  ```
  MYSQL_HOST=container-xxx.railway.app
  MYSQL_PORT=6543
  MYSQL_USER=root
  MYSQL_PASSWORD=[AUTO_GENERATED]
  MYSQL_DB=railway
  ```

### 3. Prepare Backup File

On your local machine:
```bash
cd /opt/lampp/htdocs/farmsuite

# Export the database
/opt/lampp/bin/mysqldump -u root \
  --socket=/opt/lampp/var/mysql/mysql.sock \
  farmsuite > farmsuite_backup.sql

# Verify file created
ls -lh farmsuite_backup.sql
```

### 4. Import to Railway

**Use the easiest method for your OS:**

#### On macOS/Linux:
```bash
mysql -h container-xxx.railway.app \
  -P 6543 \
  -u root \
  -p'your-railway-password' \
  railway < farmsuite_backup.sql
```

#### On Windows (using WSL or Docker):
```bash
wsl mysql -h container-xxx.railway.app -P 6543 -u root -p'your-railway-password' railway < farmsuite_backup.sql
```

#### Using Docker (Any OS):
```bash
docker run --rm -i \
  -v "$(pwd)/farmsuite_backup.sql:/backup.sql" \
  mysql:8 \
  sh -c 'mysql -h container-xxx.railway.app -P 6543 -u root -p"your-railway-password" railway < /backup.sql'
```

### 5. Verify Import Success

```bash
mysql -h container-xxx.railway.app \
  -P 6543 \
  -u root \
  -p'your-railway-password' \
  railway -e "SHOW TABLES;"

# Should list your FarmSuite tables
```

### 6. Update Environment Variables

**Backend Repository (.env)**
```env
# Replace with Railway credentials
DB_HOST=container-xxx.railway.app
DB_PORT=6543
DB_NAME=railway
DB_USER=root
DB_PASS=your-railway-password
DB_SOCKET=  # Leave empty for remote database
JWT_SECRET=your-jwt-secret
```

**Deploy to Railway/Vercel/Docker**
- Set same `DB_*` variables in deployment platform dashboard
- Redeploy

## Troubleshooting

### "Connection refused" error
- Verify Railway database is still running (check dashboard)
- Confirm firewall isn't blocking port 6543
- Make sure you're using correct port from Railway dashboard

### "Access denied for user 'root'"
- Double-check password from Railway dashboard
- Password might contain special chars - use quotes: `-p'password'`

### Import file is too large
- Railway's free tier has limits
- Try importing in chunks:
  ```bash
  split -l 10000 farmsuite_backup.sql chunk_
  for f in chunk_*; do
    mysql ... < $f
  done
  ```

### Tables not importing
- Verify backup file isn't corrupted:
  ```bash
  head -20 farmsuite_backup.sql
  tail -20 farmsuite_backup.sql
  ```
- Should show SQL CREATE/INSERT statements

## After Migration

1. **Test locally** - Run dev server and test features
2. **Backup original** - Keep `farmsuite_backup.sql` safe
3. **Switch to Railway in prod**:
   - Deploy backend with new DB credentials
   - Test all features in production
   - Keep fallback plan to revert to local DB
4. **Monitor** - Check Railway dashboard for database usage

## Pricing & Limits

**Railway Free Tier (as of Feb 2026)**:
- $5/month free credit
- Shared MySQL database included
- ~500MB storage
- Good for development/small apps

When you hit limits:
- Upgrade to paid ($0.07-0.10/GB)
- Or migrate to larger service (AWS RDS, DigitalOcean, etc.)

## Quick Reference

```bash
# Export local database
mysqldump -u root --socket=/opt/lampp/var/mysql/mysql.sock farmsuite > backup.sql

# Import to Railway
mysql -h [HOST] -P [PORT] -u [USER] -p'[PASS]' [DB] < backup.sql

# Test connection
mysql -h [HOST] -P [PORT] -u [USER] -p'[PASS]' -e "SELECT VERSION();"
```

Replace `[HOST]`, `[PORT]`, `[USER]`, `[PASS]`, `[DB]` with your Railway credentials.
