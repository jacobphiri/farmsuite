# Quick Database Setup

## 1. Create Railway MySQL Database

1. Go to https://railway.app
2. Sign in with GitHub
3. New Project → Provision New → Database → MySQL
4. Wait 1-2 minutes for provisioning
5. Click on MySQL database card
6. Go to "Connect" tab
7. Copy these values:
   - `MYSQL_HOST` (e.g., `container-xxx.railway.app`)
   - `MYSQL_PORT` (e.g., `6543`)
   - `MYSQL_USER` (usually `root`)
   - `MYSQL_PASSWORD`
   - `MYSQL_DB` (usually `railway`)

## 2. Update Configuration

Edit `.env.railway`:
```
DB_HOST=container-xxx.railway.app
DB_PORT=6543
DB_NAME=railway
DB_USER=root
DB_PASS=your-password-here
```

## 3. Export Local Database (if needed)

```bash
# Option A: Using LAMPP
/opt/lampp/bin/mysqldump -u root --socket=/opt/lampp/var/mysql/mysql.sock farmsuite > backup.sql

# Option B: Using system MySQL
mysqldump -u root -p farmsuite > backup.sql
```

## 4. Import to Railway

```bash
# Make sure you filled in .env.railway first!

# Using the import script (easiest)
./import-railway.sh backup.sql

# Or manually:
mysql -h container-xxx.railway.app -P 6543 -u root -p'password' railway < backup.sql
```

## 5. Deploy Backend

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Update database config"
   git push origin main
   ```

2. In Railway dashboard:
   - New Service → Connect GitHub repo
   - Select `farmsuite` repo
   - Set root to `ReactNative`
   - Add env vars from `.env.railway`
   - Deploy

3. Copy deployment URL (e.g., `https://your-app.railroad.app`)

## 6. Update Vercel

1. Go to Vercel project settings
2. Environment Variables
3. Add: `VITE_API_URL=https://your-app.railroad.app`
4. Redeploy

## 7. Test

Visit your Vercel URL and test login!

## Troubleshooting

- **Connection refused**: Check DB credentials in Railway dashboard
- **Access denied**: Wrong password - copy from Railway exactly
- **Database empty**: Re-run import, check backup file exists
- **Can't export**: Ensure MySQL is running (LAMPP or system MySQL)

See DATABASE_MIGRATION.md for detailed help.
