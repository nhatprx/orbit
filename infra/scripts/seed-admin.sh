#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-/opt/orbit/docker-compose.prod.yml}"

usage() {
  cat <<'EOF' >&2
Usage:
  seed-admin.sh <email> <password> [display_name]
  ADMIN_EMAIL=<email> ADMIN_PASSWORD=<password> [ADMIN_NAME=<display_name>] seed-admin.sh

Environment overrides:
  COMPOSE_FILE  Path to docker-compose file (default: /opt/orbit/docker-compose.prod.yml)
EOF
  exit 1
}

EMAIL="${1:-${ADMIN_EMAIL:-}}"
PASSWORD="${2:-${ADMIN_PASSWORD:-}}"
NAME="${3:-${ADMIN_NAME:-Orbit Admin}}"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "Error: admin email and password are required." >&2
  usage
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: compose file not found at $COMPOSE_FILE" >&2
  exit 1
fi

docker compose -f "$COMPOSE_FILE" run --rm --no-deps backend \
  java -jar /app/app.jar \
  --spring.main.web-application-type=none \
  --orbit.seed-admin.enabled=true \
  --orbit.seed-admin.email="$EMAIL" \
  --orbit.seed-admin.password="$PASSWORD" \
  --orbit.seed-admin.name="$NAME"
