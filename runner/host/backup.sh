#!/bin/bash
# Strix Database Backup Script (Host Mode)
# This script creates a compressed backup of the Strix database on a native host.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

BACKUP_DIR="$PROJECT_DIR/strix_backups"
mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/strix_db_backup_$DATE.sql.gz"

echo "Backing up Strix database to $BACKUP_FILE..."
sudo -u postgres pg_dump strix | gzip > "$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"

# Keep only the last 10 backups to save space
ls -1t "$BACKUP_DIR"/strix_db_backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -- 2>/dev/null || true

echo "Backup completed successfully: $BACKUP_FILE"
