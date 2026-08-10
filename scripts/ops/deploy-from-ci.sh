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
git fetch --prune origin main
git checkout main
git pull --ff-only origin main

readonly actual_sha="$(git rev-parse HEAD)"
if [[ "$actual_sha" != "$expected_sha" ]]; then
  echo "Refusing deployment: main is $actual_sha, expected $expected_sha." >&2
  exit 65
fi

exec bash scripts/ops/deploy-release.sh
