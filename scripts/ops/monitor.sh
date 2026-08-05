#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"
ENV_FILE="$PROJECT_DIR/.env"
STATE_DIR="${MONITOR_STATE_DIR:-/var/lib/antoinequarroz-monitor}"
STATE_FILE="$STATE_DIR/state"
HEALTH_URL="${HEALTH_URL:-https://www.antoinequarroz.ch/api/health}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/antoinequarroz}"
install -d -m 700 "$STATE_DIR"

read_env() {
  local key="$1"
  local value
  value="$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1)"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

env_max_backup_age="$(read_env MAX_BACKUP_AGE_HOURS)"
env_max_disk_usage="$(read_env MAX_DISK_USAGE_PERCENT)"
env_tls_warn_days="$(read_env MONITOR_TLS_WARN_DAYS)"
require_offsite="$(read_env REQUIRE_OFFSITE_BACKUP)"
MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-${env_max_backup_age:-36}}"
MAX_DISK_USAGE_PERCENT="${MAX_DISK_USAGE_PERCENT:-${env_max_disk_usage:-85}}"
MONITOR_TLS_WARN_DAYS="${MONITOR_TLS_WARN_DAYS:-${env_tls_warn_days:-21}}"
REQUIRE_OFFSITE_BACKUP="${REQUIRE_OFFSITE_BACKUP:-${require_offsite:-false}}"

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

if [[ "${2:-}" == "--test-alert" ]]; then
  send_alert "[TEST] Surveillance antoinequarroz.ch" "Le canal d'alerte du VPS fonctionne correctement."
  echo "Monitoring test alert sent."
  exit 0
fi

failures=0
status="unknown"
if [[ -f "$STATE_FILE" ]]; then read -r failures status < "$STATE_FILE" || true; fi

issues=()
curl --fail --silent --show-error --max-time 12 "$HEALTH_URL" | jq -e '.status == "ok"' >/dev/null \
  || issues+=("health endpoint unavailable")

tls_host="${HEALTH_URL#*://}"
tls_host="${tls_host%%/*}"
if [[ "$HEALTH_URL" == https://* ]] && ! timeout 15 openssl s_client -servername "$tls_host" -connect "$tls_host:443" </dev/null 2>/dev/null \
  | openssl x509 -checkend "$((MONITOR_TLS_WARN_DAYS * 86400))" -noout >/dev/null; then
  issues+=("TLS certificate unavailable or expiring in less than ${MONITOR_TLS_WARN_DAYS} days")
fi
docker compose -f "$PROJECT_DIR/docker-compose.yml" ps --status running --services | grep -qx web \
  || issues+=("web container not running")
docker compose -f "$PROJECT_DIR/docker-compose.yml" ps --status running --services | grep -qx caddy \
  || issues+=("caddy container not running")

disk_usage="$(df -P "$PROJECT_DIR" | awk 'NR == 2 { gsub("%", "", $5); print $5 }')"
if [[ ! "$disk_usage" =~ ^[0-9]+$ ]] || (( disk_usage >= MAX_DISK_USAGE_PERCENT )); then
  issues+=("disk usage at ${disk_usage:-unknown}%")
fi

if [[ "$REQUIRE_OFFSITE_BACKUP" == "true" ]]; then
  offsite_marker="$BACKUP_ROOT/.last-offsite-backup"
  if [[ ! -f "$offsite_marker" ]]; then
    issues+=("no independent offsite backup found")
  else
    offsite_age_hours=$(( ( $(date +%s) - $(cat "$offsite_marker") ) / 3600 ))
    (( offsite_age_hours <= MAX_BACKUP_AGE_HOURS )) || issues+=("latest independent offsite backup is ${offsite_age_hours}h old")
  fi
fi

latest_backup="$(find "$BACKUP_ROOT" -maxdepth 1 -type f -name 'aq-supabase-*.tar.gz' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n 1 | cut -d' ' -f2-)"
if [[ -z "$latest_backup" ]]; then
  issues+=("no local backup found")
else
  backup_age_hours=$(( ( $(date +%s) - $(stat -c %Y "$latest_backup") ) / 3600 ))
  (( backup_age_hours <= MAX_BACKUP_AGE_HOURS )) || issues+=("latest backup is ${backup_age_hours}h old")
fi

if (( ${#issues[@]} == 0 )); then
  if [[ "$status" == "down" ]]; then
    send_alert "[RÉTABLI] antoinequarroz.ch" "Le site et sa base de données répondent à nouveau correctement."
  fi
  printf '0 up\n' > "$STATE_FILE"
  exit 0
fi

failures=$((failures + 1))
if (( failures >= 3 )) && [[ "$status" != "down" ]]; then
  details="$(IFS='; '; echo "${issues[*]}")"
  send_alert "[ALERTE] antoinequarroz.ch" "Trois contrôles consécutifs ont échoué : $details."
  status="down"
fi
printf '%s %s\n' "$failures" "$status" > "$STATE_FILE"
exit 1
