#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3100}"
: "${CONTENT_INGEST_TOKEN:?Set CONTENT_INGEST_TOKEN to the configured server token}"

check_status() {
  local expected="$1"
  shift
  local actual
  actual="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$@")"
  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL: expected HTTP $expected, received $actual: $*" >&2
    exit 1
  fi
  echo "PASS: HTTP $expected"
}

echo "Checking database readiness..."
curl --fail --silent --show-error "$BASE_URL/api/health"
echo

echo "Checking public homepage..."
check_status 200 "$BASE_URL/"

echo "Checking ingestion authentication..."
check_status 401 -X POST "$BASE_URL/api/ingest" \
  -H 'Content-Type: application/json' -d '{}'

echo "Checking ingestion media-type validation..."
check_status 415 -X POST "$BASE_URL/api/ingest" \
  -H "Authorization: Bearer $CONTENT_INGEST_TOKEN" \
  -H 'Content-Type: text/plain' -d '{}'

echo "All read-only smoke checks passed. No content was created."
