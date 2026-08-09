#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"
ENV_FILE="$PROJECT_DIR/.env"
AUTOMATION_URL="${PIPELINE_AUTOMATION_URL:-https://www.antoinequarroz.ch/api/cron/pipeline-reminders}"

read_env() {
  local key="$1"
  local value
  value="$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1)"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

secret="$(read_env PIPELINE_AUTOMATION_SECRET)"
if [[ -z "$secret" ]]; then
  echo "PIPELINE_AUTOMATION_SECRET is missing in $ENV_FILE" >&2
  exit 1
fi

response="$(curl --fail --silent --show-error --max-time 90 \
  --request POST "$AUTOMATION_URL" \
  --header "x-automation-secret: $secret")"

printf '%s' "$response" | jq -e '.sentCount >= 0 and .failedCount == 0' >/dev/null
printf '%s\n' "$response"
