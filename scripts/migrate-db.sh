#!/bin/bash

# FarmSuite Database Migration Helper Script
# Helps export local database and prepare for Railway migration

set -e

echo "=========================================="
echo "FarmSuite Database Migration Helper"
echo "=========================================="
echo ""

# Step 1: Detect MySQL
echo "Step 1: Detecting MySQL installation..."

MYSQL_SOCKET="/opt/lampp/var/mysql/mysql.sock"
MYSQL_BIN="/opt/lampp/bin"

if [ -f "$MYSQL_BIN/mysql" ]; then
    echo "✓ Found LAMPP MySQL at $MYSQL_BIN"
    MYSQL_CMD="$MYSQL_BIN/mysql"
    MYSQLDUMP_CMD="$MYSQL_BIN/mysqldump"
elif command -v mysql &> /dev/null; then
    echo "✓ Found system MySQL"
    MYSQL_CMD="mysql"
    MYSQLDUMP_CMD="mysqldump"
else
    echo "✗ MySQL not found!"
    echo "Please install MySQL or LAMPP"
    exit 1
fi

# Step 2: Test connection
echo ""
echo "Step 2: Testing database connection..."

if [ -S "$MYSQL_SOCKET" ]; then
    echo "✓ Using socket: $MYSQL_SOCKET"
    TEST_CMD="$MYSQL_CMD --socket=$MYSQL_SOCKET -u root -e 'SELECT 1' 2>&1"
else
    echo "✓ Using network connection"
    TEST_CMD="$MYSQL_CMD -u root -e 'SELECT 1' 2>&1"
fi

if eval $TEST_CMD > /dev/null 2>&1; then
    echo "✓ Database connection successful"
else
    echo "✗ Could not connect to MySQL"
    echo "Make sure MySQL is running"
    exit 1
fi

# Step 3: Export database
echo ""
echo "Step 3: Exporting FarmSuite database..."

BACKUP_FILE="farmsuite_backup_$(date +%Y%m%d_%H%M%S).sql"

if [ -S "$MYSQL_SOCKET" ]; then
    $MYSQLDUMP_CMD --socket=$MYSQL_SOCKET -u root farmsuite > "$BACKUP_FILE" 2>&1
else
    $MYSQLDUMP_CMD -u root farmsuite > "$BACKUP_FILE" 2>&1
fi

if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    LINES=$(wc -l < "$BACKUP_FILE")
    echo "✓ Backup created: $BACKUP_FILE"
    echo "  Size: $SIZE"
    echo "  Lines: $LINES"
else
    echo "✗ Failed to create backup"
    exit 1
fi

# Step 4: Display import instructions
echo ""
echo "=========================================="
echo "Migration Instructions"
echo "=========================================="
echo ""
echo "Backup file: $BACKUP_FILE"
echo ""
echo "Next steps:"
echo "1. Go to https://railway.app"
echo "2. Create MySQL database"
echo "3. Get connection credentials"
echo "4. Run import command:"
echo ""
echo "   mysql -h [RAILWAY_HOST] -P [PORT] -u root -p'[PASSWORD]' [DB] < $BACKUP_FILE"
echo ""
echo "Replace [RAILWAY_HOST], [PORT], [PASSWORD], [DB] with Railway credentials"
echo ""
echo "Or use Docker:"
echo "   docker run --rm -i -v \$(pwd)/$BACKUP_FILE:/backup.sql mysql:8 sh -c 'mysql -h [RAILWAY_HOST] -P [PORT] -u root -p\"[PASSWORD]\" [DB] < /backup.sql'"
echo ""
echo "=========================================="
echo ""
echo "✓ Export complete!"
