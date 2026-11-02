#!/usr/bin/env bash
set -Eeuo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the CMS database connection string}"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$BACKUP_DIR/qjai_content-$timestamp.dump"

schema_exists="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc \
  "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'qjai_content')")"
if [[ "$schema_exists" != "t" ]]; then
  echo "ERROR: schema qjai_content does not exist; refusing to create an empty backup." >&2
  exit 1
fi

table_count="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'qjai_content' AND table_type = 'BASE TABLE'")"
if [[ "$table_count" -lt 1 ]]; then
  echo "ERROR: schema qjai_content contains no tables; refusing to create an empty backup." >&2
  exit 1
fi

pg_dump --format=custom --no-owner --no-acl --schema=qjai_content \
  --file="$output" "$DATABASE_URL"
pg_restore --list "$output" >/dev/null
chmod 600 "$output"

echo "Backup created and archive listing verified: $output"
echo "Tables included: $table_count"
