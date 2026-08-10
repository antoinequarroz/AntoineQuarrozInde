#!/usr/bin/env bash
set -euo pipefail

readonly expected_sha="${1:-}"
readonly base_url="${2:-https://www.antoinequarroz.ch}"
readonly max_attempts="${3:-60}"
readonly delay_seconds="${4:-5}"

if [[ ! "$expected_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Expected a full lowercase Git commit SHA." >&2
  exit 64
fi
if [[ ! "$base_url" =~ ^https?://[^[:space:]]+$ ]]; then
  echo "Expected an HTTP(S) base URL." >&2
  exit 64
fi
if [[ ! "$max_attempts" =~ ^[1-9][0-9]*$ || ! "$delay_seconds" =~ ^[0-9]+$ ]]; then
  echo "Attempts must be positive and delay must be non-negative." >&2
  exit 64
fi

for ((attempt = 1; attempt <= max_attempts; attempt += 1)); do
  version_json="$(curl --fail --silent --show-error --max-time 12 "$base_url/api/version" 2>/dev/null || true)"
  health_json="$(curl --fail --silent --show-error --max-time 12 "$base_url/api/health" 2>/dev/null || true)"

  if jq -e --arg expected "$expected_sha" '.version == $expected' <<<"$version_json" >/dev/null 2>&1 \
    && jq -e '.status == "ok" and .checks.application == "ok" and .checks.database == "ok"' <<<"$health_json" >/dev/null 2>&1; then
    echo "Production serves $expected_sha and is healthy."
    exit 0
  fi

  if (( attempt < max_attempts )); then
    sleep "$delay_seconds"
  fi
done

echo "Production did not expose healthy release $expected_sha after $max_attempts attempts." >&2
exit 1
