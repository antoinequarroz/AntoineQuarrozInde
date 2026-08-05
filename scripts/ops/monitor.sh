#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"
ENV_FILE="$PROJECT_DIR/.env"
STATE_DIR="${MONITOR_STATE_DIR:-/var/lib/antoinequarroz-monitor}"
STATE_FILE="$STATE_DIR/state"
HEALTH_URL="${HEALTH_URL:-https://www.antoinequarroz.ch/api/health}"
install -d -m 700 "$STATE_DIR"

read_env() {
  local key="$1"
  local value
  value="$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1)"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

send_alert() {
  local subject="$1"
  local message="$2"
  local api_key recipient payload
  api_key="$(read_env RESEND_API_KEY)"
  recipient="$(read_env MONITORING_ALERT_EMAIL)"
  [[ -z "$recipient" ]] && recipient="$(read_env CONTACT_EMAIL)"
  if [[ -z "$api_key" || -z "$recipient" ]]; then
    logger -t aq-monitor "$subject - $message (email alert not configured)"
    return 0
  fi
  payload="$(jq -n --arg to "$recipient" --arg subject "$subject" --arg text "$message" '{from:"Monitoring <monitoring@antoinequarroz.ch>",to:[$to],subject:$subject,text:$text}')"
  curl --fail --silent --show-error https://api.resend.com/emails \
    -H "Authorization: Bearer $api_key" \
    -H 'Content-Type: application/json' \
    --data "$payload" >/dev/null
}

failures=0
status="unknown"
if [[ -f "$STATE_FILE" ]]; then read -r failures status < "$STATE_FILE" || true; fi

if curl --fail --silent --show-error --max-time 12 "$HEALTH_URL" | jq -e '.status == "ok"' >/dev/null \
  && docker compose -f "$PROJECT_DIR/docker-compose.yml" ps --status running --services | grep -qx web \
  && docker compose -f "$PROJECT_DIR/docker-compose.yml" ps --status running --services | grep -qx caddy; then
  if [[ "$status" == "down" ]]; then
    send_alert "[RÉTABLI] antoinequarroz.ch" "Le site et sa base de données répondent à nouveau correctement."
  fi
  printf '0 up\n' > "$STATE_FILE"
  exit 0
fi

failures=$((failures + 1))
if (( failures >= 3 )) && [[ "$status" != "down" ]]; then
  send_alert "[ALERTE] antoinequarroz.ch indisponible" "Trois contrôles consécutifs ont échoué. Vérifier Docker, Caddy et Supabase sur le VPS."
  status="down"
fi
printf '%s %s\n' "$failures" "$status" > "$STATE_FILE"
exit 1
