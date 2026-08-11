#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="${1:-$(pwd)}"
ENV_FILE="$PROJECT_DIR/.env"
read_env() { sed -n "s/^${1}=//p" "$ENV_FILE" | tail -n 1 | sed 's/^"//;s/"$//'; }
SECRET="$(read_env RECURRING_AUTOMATION_SECRET)"
[[ -n "$SECRET" ]] || { echo "RECURRING_AUTOMATION_SECRET is missing" >&2; exit 1; }
curl --fail --silent --show-error "${RECURRING_AUTOMATION_URL:-https://www.antoinequarroz.ch/api/cron/recurring-invoices}" -X POST -H "x-automation-secret: $SECRET" >/dev/null
