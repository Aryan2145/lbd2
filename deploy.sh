#!/usr/bin/env bash
# Run this ON THE EC2 BOX to deploy the latest images from GHCR.
#   ./deploy.sh                  # every service in the deploy compose
#   ./deploy.sh lbd_production   # a specific service
# It pulls the newest images, restarts the containers, and cleans up old images.
#
# Note: this does NOT touch the database. LBD has no Prisma migrations folder —
# schema changes are applied by hand (see backend/prisma/manual/), so run any
# SQL yourself before deploying an image that expects a new column.
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.deploy.yml"
SERVICES=("$@")   # empty = every service in the compose file

# ${SERVICES[@]+"${SERVICES[@]}"} rather than plain "${SERVICES[@]}": on bash 4.2
# (Amazon Linux 2) an empty array trips `set -u`. This expands to zero args when
# empty, so docker compose falls through to "all services".

if [ $# -eq 0 ]; then
  echo "==> Target: all services"
else
  echo "==> Target: ${SERVICES[*]}"
fi

echo "==> Pulling latest images from GHCR..."
docker compose -f "$COMPOSE_FILE" pull ${SERVICES[@]+"${SERVICES[@]}"}

# --force-recreate guarantees the container is replaced even when the tag name
# hasn't changed. Without it a moved :production tag can leave the old
# container running, which looks exactly like "my fix didn't deploy".
echo "==> Starting/restarting containers..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate ${SERVICES[@]+"${SERVICES[@]}"}

echo "==> Cleaning up old, unused images..."
docker image prune -f

echo "==> Done. Current status:"
docker compose -f "$COMPOSE_FILE" ps
