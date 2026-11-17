#!/usr/bin/env sh
# Daily logical backup of the ONGX Postgres database.
#
#   DATABASE_URL="postgresql://ongx:ongx@localhost:5432/ongx?schema=public" \
#     sh deploy/backup-db.sh
#
# Prisma URLs may carry `?schema=public`, which libpq rejects, so the query
# string is stripped before handing the URL to pg_dump. Redis holds only cache,
# queue state and a heartbeat; it is intentionally not dumped.
set -eu

BACKUP_DIR=${BACKUP_DIR:-/var/backups/ongx}
RETENTION_DAYS=${RETENTION_DAYS:-14}

: "${DATABASE_URL:?DATABASE_URL is required}"
DB_URL=${DATABASE_URL%%\?*}

mkdir -p "$BACKUP_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
file="$BACKUP_DIR/ongx-$stamp.sql.gz"

pg_dump --no-owner --no-privileges "$DB_URL" | gzip -9 >"$file"
chmod 600 "$file"

# Drop dumps older than the retention window.
find "$BACKUP_DIR" -name 'ongx-*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -delete

echo "$file"
