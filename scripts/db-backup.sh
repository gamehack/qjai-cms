#!/usr/bin/env bash
set -Eeuo pipefail

: "\${DATABASE_URL:?Set DATABASE_URL to the CMS database connection string}"

ALLOW_EMPTY_SCHEMA="\${ALLOW_EMPTY_SCHEMA:-0}"
if [[ "$ALLOW_EMPTY_SCHEMA" != "0" && "$ALLOW_EMPTY_SCHEMA" != "1" ]]; then
  echo "ERROR: ALLOW_EMPTY_SCHEMA must be 0 or 1." >&2
  exit 1
fi

BACKUP_DIR="\${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$BACKUP_DIR/qjai_content-$timestamp.dump"

schema_exists="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc \
  "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'qjai_content')")"
if [[ "$schema_exists" != "t" ]]; then
  echo "ERROR: schema qjai_content does not exist; refusing to create a backup." >&2
  exit 1
fi

table_count="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'qjai_content' AND table_type = 'BASE TABLE'")"
if [[ "$table_count" -lt 1 && "$ALLOW_EMPTY_SCHEMA" != "1" ]]; then
  echo "ERROR: schema qjai_content contains no tables; set ALLOW_EMPTY_SCHEMA=1 only for an intentional empty-schema baseline." >&2
  exit 1
fi

pg_dump --format=custom --no-owner --no-acl --schema=qjai_content \
  --file="$output" "$DATABASE_URL"
archive_list="$(pg_restore --list "$output")"
if ! grep -Fq 'SCHEMA - qjai_content' <<<"$archive_list"; then
  rm -f "$output"
  echo "ERROR: backup archive does not contain the qjai_content schema entry." >&2
  exit 1
fi
chmod 600 "$output"

echo "Backup created and archive listing verified: $output"
if [[ "$table_count" -lt 1 ]]; then
  echo "Tables included: 0 (explicit empty-schema baseline)"
else
  echo "Tables included: $table_count"
fi
