#!/bin/bash

# FarmSuite Quick Database Setup
# Simple setup without requiring MySQL connection check

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_step() {
    echo -e "\n${BLUE}→ $1${NC}"
}

# Start setup
print_header "FarmSuite Database Setup"

print_step "Creating configuration files..."

# Create .env.railway template
cat > ".env.railway" << 'EOF'
# Railway Production Environment
# Fill in values from your Railway MySQL database

PORT=8080
NODE_ENV=production

# Railway MySQL (from Railway dashboard)
DB_HOST=
DB_PORT=
DB_NAME=railway
DB_USER=root
DB_PASS=
DB_SOCKET=

# Security
JWT_SECRET=
JWT_EXPIRES_IN=12h

# Cache
CACHE_TTL_SECONDS=45
LOCAL_DB_PATH=server/data/farmreact_local_cache.sqlite
EOF

print_success "Created .env.railway (fill in Railway credentials)"

# Create import script template
cat > "import-railway.sh" << 'EOF'
#!/bin/bash

# Import database to Railway
# Usage: ./import-railway.sh backup_file.sql

BACKUP_FILE="${1:-farmsuite_backup.sql}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: File not found: $BACKUP_FILE"
    echo "Usage: $0 backup_file.sql"
    exit 1
fi

# Get credentials from .env.railway
DB_HOST=$(grep "DB_HOST=" .env.railway | cut -d= -f2 | tr -d ' ')
DB_PORT=$(grep "DB_PORT=" .env.railway | cut -d= -f2 | tr -d ' ')
DB_NAME=$(grep "DB_NAME=" .env.railway | cut -d= -f2 | tr -d ' ')
DB_USER=$(grep "DB_USER=" .env.railway | cut -d= -f2 | tr -d ' ')
DB_PASS=$(grep "DB_PASS=" .env.railway | cut -d= -f2 | tr -d ' ')

if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_PASS" ]; then
    echo "Error: Missing database credentials in .env.railway"
    echo "Fill in: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS"
    exit 1
fi

echo "Importing $BACKUP_FILE to $DB_HOST:$DB_PORT/$DB_NAME..."
echo ""

# Try Docker first
if command -v docker &> /dev/null; then
    echo "Using Docker..."
    docker run --rm -i \
        -v "$(pwd)/$BACKUP_FILE:/backup.sql" \
        mysql:8 \
        sh -c "mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p\"$DB_PASS\" $DB_NAME < /backup.sql" && \
    echo "✓ Import successful!"
else
    echo "Using mysql CLI..."
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$BACKUP_FILE" && \
    echo "✓ Import successful!"
fi
EOF

chmod +x import-railway.sh
print_success "Created import-railway.sh"

# Create setup guide
cat > "SETUP_QUICK.md" << 'EOF'
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
EOF

print_success "Created SETUP_QUICK.md"

# Create credentials reference
cat > ".credentials.example" << 'EOF'
# Save your Railway credentials here (don't commit!)
# Used by import-railway.sh

# Get these from Railway MySQL database "Connect" tab:
RAILWAY_HOST=
RAILWAY_PORT=
RAILWAY_USER=
RAILWAY_PASSWORD=
RAILWAY_DB=
EOF

print_success "Created .credentials.example"

# Summary
print_header "Setup Files Created"

echo ""
echo "📄 New Files:"
echo "  1. .env.railway - Railway database config (EDIT THIS!)"
echo "  2. import-railway.sh - Import tool"
echo "  3. SETUP_QUICK.md - Quick guide"
echo "  4. .credentials.example - Reference template"
echo ""
echo "🚀 Next Steps:"
echo "  1. Create Railway MySQL database: https://railway.app"
echo "  2. Copy DB credentials from Railway dashboard"
echo "  3. Edit .env.railway with your credentials"
echo "  4. Export local database (if needed):"
echo "     /opt/lampp/bin/mysqldump -u root --socket=/opt/lampp/var/mysql/mysql.sock farmsuite > backup.sql"
echo "  5. Run: ./import-railway.sh backup.sql"
echo "  6. Commit and push to GitHub"
echo "  7. Deploy to Railway"
echo "  8. Update Vercel with VITE_API_URL"
echo ""
echo "📖 Documentation: SETUP_QUICK.md"
echo ""

print_success "Setup files created!"
EOF
