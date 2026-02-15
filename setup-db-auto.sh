#!/bin/bash

# FarmSuite Database Auto-Setup Wizard
# Automates database migration to Railway

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_step() {
    echo -e "\n${BLUE}→ $1${NC}"
}

# Check requirements
check_requirements() {
    print_step "Checking system requirements..."
    
    # Check for MySQL/MariaDB
    if command -v mysql &> /dev/null; then
        MYSQL_CMD="mysql"
        MYSQLDUMP_CMD="mysqldump"
        print_success "Found MySQL"
    elif [ -f "/opt/lampp/bin/mysql" ]; then
        MYSQL_CMD="/opt/lampp/bin/mysql"
        MYSQLDUMP_CMD="/opt/lampp/bin/mysqldump"
        print_success "Found LAMPP MySQL"
    else
        print_error "MySQL not found"
        print_info "Install XAMPP/LAMPP or MySQL"
        exit 1
    fi
    
    # Check for Docker (optional)
    if command -v docker &> /dev/null; then
        print_success "Found Docker"
        HAS_DOCKER=true
    else
        print_info "Docker not found (optional, can still migrate)"
        HAS_DOCKER=false
    fi
}

# Test database connection
test_connection() {
    print_step "Testing local database connection..."
    
    MYSQL_SOCKET="/opt/lampp/var/mysql/mysql.sock"
    
    if [ -S "$MYSQL_SOCKET" ]; then
        TEST_CMD="$MYSQL_CMD --socket=$MYSQL_SOCKET -u root -e 'SELECT VERSION();' 2>&1"
    else
        TEST_CMD="$MYSQL_CMD -u root -e 'SELECT VERSION();' 2>&1"
    fi
    
    if eval $TEST_CMD > /dev/null 2>&1; then
        print_success "Local database connection OK"
        return 0
    else
        print_error "Could not connect to local database"
        print_info "Ensure MySQL is running:"
        echo "  sudo /opt/lampp/./manager-linux-x64.run  (LAMPP GUI)"
        echo "  or: /opt/lampp/./xampp start"
        exit 1
    fi
}

# Export database
export_database() {
    print_step "Exporting local FarmSuite database..."
    
    MYSQL_SOCKET="/opt/lampp/var/mysql/mysql.sock"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="farmsuite_backup_${TIMESTAMP}.sql"
    
    if [ -S "$MYSQL_SOCKET" ]; then
        $MYSQLDUMP_CMD --socket=$MYSQL_SOCKET -u root --no-password farmsuite > "$BACKUP_FILE" 2>&1
    else
        $MYSQLDUMP_CMD -u root farmsuite > "$BACKUP_FILE" 2>&1
    fi
    
    if [ -f "$BACKUP_FILE" ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        LINES=$(wc -l < "$BACKUP_FILE")
        print_success "Database exported"
        echo "  File: $BACKUP_FILE"
        echo "  Size: $SIZE"
        echo "  Tables: $(grep -c "CREATE TABLE" "$BACKUP_FILE")"
        EXPORTED_FILE="$BACKUP_FILE"
    else
        print_error "Failed to export database"
        exit 1
    fi
}

# Create .env.railway
create_env_template() {
    print_step "Creating environment templates..."
    
    # Create .env.railway template
    cat > ".env.railway.template" << 'EOF'
# Railway Production Environment Variables
# Copy this to .env and fill in with your Railway credentials

PORT=8080
NODE_ENV=production

# Railway MySQL Database (get from Railway dashboard)
DB_HOST=container-xxx.railway.app
DB_PORT=xxxxx
DB_NAME=railway
DB_USER=root
DB_PASS=your-railway-password-here
DB_SOCKET=

# JWT Secret (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-secure-32-character-random-secret-here
JWT_EXPIRES_IN=12h

# Cache settings
CACHE_TTL_SECONDS=45
LOCAL_DB_PATH=server/data/farmreact_local_cache.sqlite

# Frontend API URL (for Vercel)
# VITE_API_URL=https://your-railway-backend.up.railway.app
EOF
    
    print_success "Created .env.railway.template"
}

# Generate JWT secret
generate_jwt_secret() {
    print_step "Generating JWT_SECRET..."
    
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)
    
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET="$(date +%s)$(echo $RANDOM | md5sum | head -c 20)"
    fi
    
    print_success "JWT Secret generated"
    echo $JWT_SECRET
}

# Create setup checklist
create_checklist() {
    print_step "Creating setup checklist..."
    
    JWT_SECRET=$(generate_jwt_secret)
    
    cat > "SETUP_CHECKLIST.md" << EOF
# FarmSuite Database Migration Checklist

## Status: $(date)

### ✓ Completed
- [x] Local database exported to: $EXPORTED_FILE
- [x] System requirements verified
- [x] JWT Secret generated

### TODO: Railway Setup

#### 1. Create Railway Account
- [ ] Go to https://railway.app
- [ ] Sign in with GitHub
- [ ] Create new project

#### 2. Provision MySQL Database
- [ ] Click "Provision New"
- [ ] Select "Database" → "MySQL"
- [ ] Wait for provisioning (1-2 min)
- [ ] Click on MySQL card
- [ ] Go to "Connect" tab
- [ ] Copy these values:
  - [ ] MYSQL_HOST (e.g., container-xxx.railway.app)
  - [ ] MYSQL_PORT (e.g., 6543)
  - [ ] MYSQL_USER (usually root)
  - [ ] MYSQL_PASSWORD
  - [ ] MYSQL_DB (usually railway)

#### 3. Import Database
**Option A: Using Docker (Recommended)**
\`\`\`bash
docker run --rm -i \\
  -v "\$(pwd)/$EXPORTED_FILE:/backup.sql" \\
  mysql:8 \\
  sh -c 'mysql -h [MYSQL_HOST] -P [MYSQL_PORT] -u [MYSQL_USER] -p"[MYSQL_PASSWORD]" [MYSQL_DB] < /backup.sql'
\`\`\`

**Option B: Using CLI**
\`\`\`bash
mysql -h [MYSQL_HOST] -P [MYSQL_PORT] -u [MYSQL_USER] -p'[MYSQL_PASSWORD]' [MYSQL_DB] < $EXPORTED_FILE
\`\`\`

#### 4. Create Backend Service
- [ ] In Railway, click "Provision New"
- [ ] Select "Service" → "Connect GitHub"
- [ ] Select jacobphiri/farmsuite repo
- [ ] Set root to: ReactNative

#### 5. Configure Environment Variables
Copy these to Railway dashboard:
\`\`\`
DB_HOST=[MYSQL_HOST from above]
DB_PORT=[MYSQL_PORT from above]
DB_NAME=[MYSQL_DB from above]
DB_USER=[MYSQL_USER from above]
DB_PASS=[MYSQL_PASSWORD from above]
DB_SOCKET=
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=12h
CACHE_TTL_SECONDS=45
LOCAL_DB_PATH=server/data/farmreact_local_cache.sqlite
\`\`\`

#### 6. Deploy
- [ ] Click "Deploy"
- [ ] Wait for deployment (2-5 min)
- [ ] Copy deployment URL

#### 7. Configure Vercel Frontend
- [ ] Go to Vercel project
- [ ] Settings → Environment Variables
- [ ] Add: VITE_API_URL=[Your Railway Backend URL]
- [ ] Redeploy

#### 8. Test
- [ ] Visit Vercel URL
- [ ] Try logging in
- [ ] Test basic features

## Files Created
- farmsuite_backup_*.sql - Database backup for import
- .env.railway.template - Environment variable template
- SETUP_CHECKLIST.md - This checklist

## JWT Secret (Keep Safe)
\`\`\`
$JWT_SECRET
\`\`\`

## Documentation
- See DATABASE_MIGRATION.md for detailed guide
- See README.md for quick start
- See DEPLOYMENT.md for architecture overview

## Questions?
1. Check DATABASE_MIGRATION.md troubleshooting section
2. Review Railway documentation: https://docs.railway.app
3. Check GitHub issues in jacobphiri/farmsuite

---
Generated: $(date)
EOF
    
    print_success "Created SETUP_CHECKLIST.md"
}

# Create .env file if it doesn't exist
create_env_file() {
    print_step "Setting up .env files..."
    
    if [ ! -f ".env" ]; then
        cp ".env.example" ".env" 2>/dev/null || echo "Using default .env setup"
        print_success "Created .env (using local MySQL defaults)"
    else
        print_info ".env already exists"
    fi
    
    if [ ! -f ".env.railway" ]; then
        cp ".env.railway.template" ".env.railway"
        print_info ".env.railway created - fill in Railway credentials"
    fi
}

# Create quick import script
create_import_script() {
    print_step "Creating import helper script..."
    
    IMPORT_SCRIPT="import-to-railway.sh"
    
    cat > "$IMPORT_SCRIPT" << 'EOF'
#!/bin/bash
# Import FarmSuite database to Railway

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}FarmSuite Database Import to Railway${NC}"
echo "======================================"
echo ""

# Get Railway credentials
read -p "Enter MYSQL_HOST (from Railway): " DB_HOST
read -p "Enter MYSQL_PORT (from Railway): " DB_PORT
read -p "Enter MYSQL_DB (from Railway): " DB_NAME
read -p "Enter MYSQL_USER (from Railway): " DB_USER
read -sp "Enter MYSQL_PASSWORD (from Railway): " DB_PASS
echo ""

# Find backup file
BACKUP_FILE=$(ls -t farmsuite_backup_*.sql 2>/dev/null | head -1)

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}✗ No backup file found (farmsuite_backup_*.sql)${NC}"
    echo "Run: ./setup-db-auto.sh"
    exit 1
fi

echo ""
echo -e "${YELLOW}Importing: $BACKUP_FILE${NC}"
echo "To: $DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# Check for Docker
if command -v docker &> /dev/null; then
    echo "Using Docker for import..."
    docker run --rm -i \
        -v "$(pwd)/$BACKUP_FILE:/backup.sql" \
        mysql:8 \
        sh -c "mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p\"$DB_PASS\" $DB_NAME < /backup.sql"
else
    echo "Using CLI for import..."
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database imported successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Add environment variables to Railway:"
    cat .env.railway | grep "DB_" | grep -v "^#"
    echo ""
    echo "2. Deploy backend to Railway"
    echo "3. Configure Vercel with VITE_API_URL"
else
    echo -e "${RED}✗ Import failed${NC}"
    echo "Check your Railway credentials and try again"
    exit 1
fi
EOF
    
    chmod +x "$IMPORT_SCRIPT"
    print_success "Created $IMPORT_SCRIPT"
}

# Summary
print_summary() {
    print_header "Setup Summary"
    
    echo ""
    echo "✓ Completed:"
    echo "  - Local database exported"
    echo "  - System requirements verified"
    echo "  - Environment templates created"
    echo "  - Setup checklist generated"
    echo ""
    echo "📁 Files created:"
    echo "  - $EXPORTED_FILE (database backup)"
    echo "  - .env.railway.template (Railway config template)"
    echo "  - .env.railway (Railway config - fill in credentials)"
    echo "  - import-to-railway.sh (automated import script)"
    echo "  - SETUP_CHECKLIST.md (step-by-step guide)"
    echo ""
    echo "🚀 Next steps:"
    echo "  1. Go to https://railway.app"
    echo "  2. Create MySQL database"
    echo "  3. Fill in Railway credentials in .env.railway"
    echo "  4. Run: ./import-to-railway.sh"
    echo "  5. Deploy backend to Railway"
    echo "  6. Update Vercel with VITE_API_URL"
    echo ""
    echo "📖 Documentation:"
    echo "  - See SETUP_CHECKLIST.md for detailed step-by-step"
    echo "  - See DATABASE_MIGRATION.md for troubleshooting"
    echo ""
}

# Main execution
main() {
    print_header "FarmSuite Database Auto-Setup"
    
    check_requirements
    test_connection
    export_database
    create_env_template
    create_checklist
    create_env_file
    create_import_script
    print_summary
    
    print_success "Setup complete!"
}

# Run main
main
