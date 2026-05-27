#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BRANCH="${BRANCH:-main}"

log() {
  printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need_cmd git
need_cmd docker

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is required (Docker Compose v2)." >&2
  exit 1
fi

cd "$APP_DIR"

if [[ ! -f ".env" ]]; then
  echo ".env file not found in $APP_DIR" >&2
  exit 1
fi

log "Fetching latest changes from origin/$BRANCH"
git fetch --prune origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

log "Rebuilding and restarting containers"
docker compose up -d --build --remove-orphans

log "Cleaning unused images"
docker image prune -f >/dev/null 2>&1 || true

log "Deployment done"
docker compose ps
