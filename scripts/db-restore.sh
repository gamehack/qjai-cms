#!/usr/bin/env bash
set -Eeuo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the EMPTY target database connection string}"
: "${BACKUP_FILE:?Set BACKUP_FILE to a verified qjai_content custom-format dump}"

if [[ "${CONFIRM_RESTORE:-}" != "RESTORE_QJAI_CONTENT_TO_EMPTY_DATABASE" ]]; then
  echo "ERROR: set CONFIRM_RESTORE=RESTORE_QJAI_CONTENT_TO_EMPTY_DATABASE to proceed." >&2
  exit 1
fi
if [[ ! -f "$BACKUP_FILE" || -L "$BACKUP_FILE" ]]; then
  echo "ERROR: BACKUP_FILE must be an existing regular file, not a symlink." >&2
  exit 1
fi

pg_restore --list "$BACKUP_FILE" >/dev/null

schema_exists="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc \
  "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'qjai_content')")"
if [[ "$schema_exists" == "t" ]]; then
  echo "ERROR: target already contains qjai_content. Restore only into a new, empty database." >&2
  exit 1
fi

echo "Restoring qjai_content into the explicitly selected empty target database."
pg_restore --no-owner --no-acl --exit-on-error --dbname="$DATABASE_URL" "$BACKUP_FILE"

table_count="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'qjai_content' AND table_type = 'BASE TABLE'")"
if [[ "$table_count" -lt 1 ]]; then
  echo "ERROR: restore finished but no tables were found in qjai_content." >&2
  exit 1
fi

echo "Restore completed. Tables present: $table_count"
