#!/usr/bin/env bash
# Post-up verification for docker-compose.yml.
# Builds, starts both services, waits for healthchecks, verifies the shared
# courses volume is visible from both containers, then tears down (keeping data).
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Building and starting services"
docker compose up -d --build

wait_healthy() {
  local service="$1"
  local container_id
  container_id="$(docker compose ps -q "$service")"
  echo "==> Waiting for $service to become healthy"
  for _ in $(seq 1 60); do
    local status
    status="$(docker inspect -f '{{.State.Health.Status}}' "$container_id" 2>/dev/null || echo unknown)"
    if [ "$status" = "healthy" ]; then
      echo "    $service is healthy"
      return 0
    fi
    sleep 2
  done
  echo "ERROR: $service did not become healthy in time" >&2
  docker compose logs "$service" >&2
  return 1
}

wait_healthy learner
wait_healthy studio

echo "==> Checking HTTP endpoints"
curl -fsS http://localhost:4001/ >/dev/null
echo "    learner http://localhost:4001/ OK"
curl -fsS http://localhost:4000/ >/dev/null
echo "    studio  http://localhost:4000/ OK"

echo "==> Checking seeded examples are visible from the learner container"
docker compose exec -T learner ls /data/courses | grep -q hello-world
echo "    hello-world present in shared volume"

echo "==> Checking the volume is shared between services"
docker compose exec -T studio touch /data/courses/.smoke-marker
docker compose exec -T learner test -f /data/courses/.smoke-marker
docker compose exec -T studio rm /data/courses/.smoke-marker
echo "    marker written via studio and read via learner"

echo ""
echo "Smoke test passed."
echo "Learner: http://localhost:4001   Studio: http://localhost:4000"
echo "Run 'docker compose down' when finished ('down -v' resets course data)."
