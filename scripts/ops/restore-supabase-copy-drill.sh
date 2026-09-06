#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"
ENV_FILE="$PROJECT_DIR/.env"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/antoinequarroz}"

read_env() {
  local key="$1"
  local value
  value="$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1)"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

[[ -f "$ENV_FILE" ]] || { echo "Missing environment file: $ENV_FILE" >&2; exit 1; }
SUPABASE_URL="$(read_env SUPABASE_URL)"
SERVICE_KEY="$(read_env SUPABASE_SERVICE_ROLE_KEY)"
[[ "$SUPABASE_URL" == https://* && -n "$SERVICE_KEY" ]] \
  || { echo "Supabase backup access is not configured" >&2; exit 1; }

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

curl --fail --silent --show-error \
  "$SUPABASE_URL/storage/v1/object/list/backups" \
  -X POST \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  --data '{"prefix":"database","limit":1000,"offset":0,"sortBy":{"column":"name","order":"desc"}}' \
  > "$WORK_DIR/index.json"

latest="$(jq -r '[.[] | .name | select(test("^aq-supabase-[0-9]{8}T[0-9]{6}Z\\.tar\\.gz$"))] | sort | last // empty' "$WORK_DIR/index.json")"
[[ -n "$latest" ]] || { echo "No remote Supabase backup archive found" >&2; exit 1; }

archive="$WORK_DIR/$latest"
for object in "$latest" "$latest.sha256"; do
  curl --fail --silent --show-error \
    "$SUPABASE_URL/storage/v1/object/authenticated/backups/database/$object" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -o "$WORK_DIR/$object"
done

"$PROJECT_DIR/scripts/ops/restore-drill.sh" "$archive" "$PROJECT_DIR"
install -d -m 700 "$BACKUP_ROOT"
date -u +%s > "$BACKUP_ROOT/.last-restore-drill"
chmod 600 "$BACKUP_ROOT/.last-restore-drill"

echo "Remote Supabase restore drill passed: $latest"
