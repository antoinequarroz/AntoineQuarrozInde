#!/usr/bin/env bash
set -Eeuo pipefail

readonly container_name="antoinequarroz-web"
readonly image_name="antoinequarroz-web"
readonly candidate_tag="candidate"
readonly previous_tag="previous"
readonly max_health_attempts=45

validate_caddy_config() {
  docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
}

reload_caddy_config() {
  # Git may replace the bind-mounted Caddyfile inode during checkout. Recreate
  # the container so it mounts the release file before asking Caddy to reload.
  docker compose up -d --no-deps --force-recreate caddy
  docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
}

wait_for_health() {
  local attempt status

  for ((attempt = 1; attempt <= max_health_attempts; attempt += 1)); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container_name" 2>/dev/null || true)"

    case "$status" in
      healthy)
        return 0
        ;;
      unhealthy)
        echo "The web container became unhealthy." >&2
        return 1
        ;;
    esac

    sleep 2
  done

  echo "The web container did not become healthy in time." >&2
  return 1
}

previous_image="$(docker inspect --format '{{.Image}}' "$container_name" 2>/dev/null || true)"
if [[ -n "$previous_image" ]]; then
  docker image tag "$previous_image" "$image_name:$previous_tag"
fi

rollback() {
  local exit_code=$?
  trap - ERR

  echo "Deployment failed; starting automatic rollback." >&2
  if [[ -z "$previous_image" ]]; then
    echo "No previous image is available for rollback." >&2
    exit "$exit_code"
  fi

  export APP_IMAGE_TAG="$previous_tag"
  if docker compose up -d --no-build web && wait_for_health; then
    echo "Rollback completed: the previous image is healthy." >&2
  else
    echo "Rollback failed: manual intervention is required." >&2
  fi

  exit "$exit_code"
}

export APP_VERSION="$(git rev-parse HEAD)"
export APP_BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export APP_IMAGE_TAG="$candidate_tag"

validate_caddy_config

trap rollback ERR
docker compose build web
docker compose up -d --no-build --remove-orphans
wait_for_health
reload_caddy_config

# The VPS deliberately keeps the application runtime inside Docker. Make the
# candidate image's Node binary available to the post-deploy proof scripts
# without installing a second runtime on the host.
if ! command -v node >/dev/null 2>&1; then
  export PATH="$PWD/scripts/ops/node-proof-bin:$PATH"
fi

bash scripts/ops/verify-seo-release.sh "$APP_VERSION" https://www.antoinequarroz.ch https://antoinequarroz.ch
trap - ERR

docker compose ps
echo "DEPLOYED_VERSION=$APP_VERSION"
echo "DEPLOYED_AT=$APP_BUILD_TIME"
