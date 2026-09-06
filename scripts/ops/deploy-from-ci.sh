#!/usr/bin/env bash
set -Eeuo pipefail

readonly expected_sha="${1:-}"
readonly requested_project_dir="${2:-}"

if [[ ! "$expected_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Expected a full lowercase Git commit SHA." >&2
  exit 64
fi

if [[ -z "$requested_project_dir" || "$requested_project_dir" != /* ]]; then
  echo "Expected an absolute VPS project directory." >&2
  exit 64
fi

readonly project_dir="$(realpath "$requested_project_dir")"
if [[ ! -f "$project_dir/docker-compose.yml" || ! -f "$project_dir/.env" || ! -d "$project_dir/.git" ]]; then
  echo "The VPS project directory is incomplete." >&2
  exit 66
fi

cd "$project_dir"

assert_clean_checkout() {
  local dirty_files
  dirty_files="$(git status --porcelain=v1 --untracked-files=all)"
  if [[ -n "$dirty_files" ]]; then
    echo "Refusing deployment: the VPS Git checkout contains local changes:" >&2
    printf '%s\n' "$dirty_files" >&2
    exit 65
  fi
}

# A deployment must never silently include operator-created or modified files.
# The ignored runtime .env remains outside Git and is injected by Compose only
# when the committed image is started.
assert_clean_checkout
git fetch --prune origin main
git checkout main
git pull --ff-only origin main
assert_clean_checkout

readonly actual_sha="$(git rev-parse HEAD)"
if [[ "$actual_sha" != "$expected_sha" ]]; then
  echo "Refusing deployment: main is $actual_sha, expected $expected_sha." >&2
  exit 65
fi

exec bash scripts/ops/deploy-release.sh
