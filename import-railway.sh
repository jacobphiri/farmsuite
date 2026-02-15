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
