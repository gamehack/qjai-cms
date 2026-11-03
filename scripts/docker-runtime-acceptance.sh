#!/usr/bin/env bash
set -Eeuo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the CI PostgreSQL URL reachable from Docker}"
: "${CONTENT_INGEST_TOKEN:?Set CONTENT_INGEST_TOKEN to a CI-only token}"

IMAGE_TAG="${IMAGE_TAG:-sha-ci}"
IMAGE_SHA="${IMAGE_SHA:-ci}"
SITE_URL="${SITE_URL:-http://127.0.0.1:3100}"
SITE_NAME="${SITE_NAME:-qjai-cms CI}"
COMPOSE_CI_FILE="$(mktemp)"
CI_CA_DIR="$(mktemp -d)"
CI_CA_FILE="$CI_CA_DIR/supabase-ca.crt"

if [[ -e .env || -e .migration.env ]]; then
  echo "ERROR: refusing to overwrite existing .env or .migration.env files." >&2
  rm -f "$COMPOSE_CI_FILE"
  exit 1
fi

cleanup() {
  if [[ -f .env && -f .migration.env ]]; then
    IMAGE_TAG="$IMAGE_TAG" IMAGE_SHA="$IMAGE_SHA" \
      docker compose -f compose.yaml -f "$COMPOSE_CI_FILE" down --remove-orphans >/dev/null 2>&1 || true
  fi
  rm -f .env .migration.env "$COMPOSE_CI_FILE"
  rm -rf -- "$CI_CA_DIR"
}
trap cleanup EXIT

# This acceptance test uses a disposable local CI database without TLS.
# Generate a test-only CA so the production CA bind mount can be validated
# without requiring /etc/qjai-cms on ephemeral GitHub-hosted runners.
# The private key is never mounted into a container or committed.
openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 1 \
  -subj '/CN=qjai-cms-ephemeral-ci-ca' \
  -keyout "$CI_CA_DIR/ci-key.pem" -out "$CI_CA_FILE" >/dev/null 2>&1
chmod 644 "$CI_CA_FILE"

cat > "$COMPOSE_CI_FILE" <<YAML
services:
  qjai-cms:
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - type: bind
        source: $CI_CA_FILE
        target: /run/secrets/supabase-ca.crt
        read_only: true
        bind:
          create_host_path: false
  qjai-cms-migrate:
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - type: bind
        source: $CI_CA_FILE
        target: /run/secrets/supabase-ca.crt
        read_only: true
        bind:
          create_host_path: false
YAML

echo "Building the production runtime image..."
docker build --target runtime -t "ghcr.io/gamehack/qjai-cms:$IMAGE_TAG" .

echo "Building the one-shot migration image..."
docker build --target migrate -t "ghcr.io/gamehack/qjai-cms:migrate-$IMAGE_SHA" .

umask 077
cat > .env <<EOF
DATABASE_URL=$DATABASE_URL
PAYLOAD_SECRET=ci-only-runtime-secret-never-used-in-production
SITE_URL=$SITE_URL
SITE_NAME=$SITE_NAME
CONTENT_INGEST_TOKEN=$CONTENT_INGEST_TOKEN
EOF

cat > .migration.env <<EOF
DATABASE_URL=$DATABASE_URL
EOF

export IMAGE_TAG IMAGE_SHA

echo "Running the migration image against the disposable CI database..."
docker compose -f compose.yaml -f "$COMPOSE_CI_FILE" --profile migrate run --rm qjai-cms-migrate

echo "Starting the production runtime image with loopback-only port binding..."
docker compose -f compose.yaml -f "$COMPOSE_CI_FILE" up -d qjai-cms

healthy=false
for attempt in $(seq 1 90); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' qjai-cms 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    healthy=true
    break
  fi
  if [[ "$status" == "unhealthy" ]]; then
    docker logs qjai-cms
    echo "ERROR: production container health check failed." >&2
    exit 1
  fi
  sleep 2
done

if [[ "$healthy" != true ]]; then
  docker logs qjai-cms
  echo "ERROR: production container did not become healthy within 180 seconds." >&2
  exit 1
fi

port_bindings="$(docker inspect --format '{{json .HostConfig.PortBindings}}' qjai-cms)"
if [[ "$port_bindings" != *'"HostIp":"127.0.0.1"'* ]]; then
  echo "ERROR: CMS port is not bound exclusively to loopback: $port_bindings" >&2
  exit 1
fi

container_uid="$(docker exec qjai-cms id -u)"
if [[ "$container_uid" == "0" ]]; then
  echo "ERROR: runtime container is running as root." >&2
  exit 1
fi

echo "Running read-only HTTP smoke checks..."
BASE_URL="$SITE_URL" CONTENT_INGEST_TOKEN="$CONTENT_INGEST_TOKEN" bash scripts/smoke-test.sh

echo "PASS: production runtime, migration image, database readiness, non-root user, loopback binding and HTTP smoke checks."
