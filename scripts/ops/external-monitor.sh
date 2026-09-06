#!/usr/bin/env bash
set -euo pipefail

HEALTH_URL="${HEALTH_URL:-https://www.antoinequarroz.ch/api/health}"
VERSION_URL="${VERSION_URL:-https://www.antoinequarroz.ch/api/version}"
MONITOR_ATTEMPTS="${MONITOR_ATTEMPTS:-3}"
MONITOR_RETRY_SECONDS="${MONITOR_RETRY_SECONDS:-10}"

if [[ ! "$MONITOR_ATTEMPTS" =~ ^[1-9][0-9]*$ ]] || [[ ! "$MONITOR_RETRY_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "Invalid external monitor retry configuration." >&2
  exit 64
fi

for (( attempt = 1; attempt <= MONITOR_ATTEMPTS; attempt += 1 )); do
  health_json="$(curl --fail --silent --show-error --max-time 12 "$HEALTH_URL" 2>/dev/null || true)"
  version_json="$(curl --fail --silent --show-error --max-time 12 "$VERSION_URL" 2>/dev/null || true)"

  if jq -e '.status == "ok" and .checks.application == "ok" and .checks.database == "ok"' <<<"$health_json" >/dev/null 2>&1 \
    && jq -e '.environment == "production" and (.version | type == "string" and test("^[0-9a-f]{40}$"))' <<<"$version_json" >/dev/null 2>&1; then
    echo "Production health and immutable version checks passed."
    exit 0
  fi

  if (( attempt < MONITOR_ATTEMPTS )); then
    sleep "$MONITOR_RETRY_SECONDS"
  fi
done

echo "Production remained unhealthy after ${MONITOR_ATTEMPTS} independent checks." >&2
exit 1
