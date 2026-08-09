#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"
ENV_FILE="$PROJECT_DIR/.env"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/antoinequarroz}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

read_env() {
  local key="$1"
  local value
  value="$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1)"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 1
fi

SUPABASE_URL="$(read_env SUPABASE_URL)"
SERVICE_KEY="$(read_env SUPABASE_SERVICE_ROLE_KEY)"
if [[ -z "$SUPABASE_URL" || -z "$SERVICE_KEY" ]]; then
  echo "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing" >&2
  exit 1
fi

install -d -m 700 "$BACKUP_ROOT"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK_DIR="$(mktemp -d "$BACKUP_ROOT/.aq-backup-${STAMP}-XXXX")"
ARCHIVE="$BACKUP_ROOT/aq-supabase-${STAMP}.tar.gz"
trap 'rm -rf "$WORK_DIR"' EXIT

TABLES=(
  organizations organization_memberships clients projects tasks appointments
  quotes quote_items invoices invoice_items invoice_payments articles reviews contact_messages
  marketing_events audit_logs admin_saved_views application_errors
)

for table in "${TABLES[@]}"; do
  curl --fail --silent --show-error \
    "$SUPABASE_URL/rest/v1/$table?select=*&limit=100000" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Accept: application/json" \
    > "$WORK_DIR/$table.json"
done

mkdir -p "$WORK_DIR/storage/media/uploads"
curl --fail --silent --show-error \
  "$SUPABASE_URL/storage/v1/object/list/media" \
  -X POST \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  --data '{"prefix":"uploads","limit":10000,"offset":0,"sortBy":{"column":"name","order":"asc"}}' \
  > "$WORK_DIR/storage/media-index.json"

jq -r '.[] | select(.metadata != null) | .name' "$WORK_DIR/storage/media-index.json" | while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  curl --fail --silent --show-error \
    "$SUPABASE_URL/storage/v1/object/authenticated/media/uploads/$name" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -o "$WORK_DIR/storage/media/uploads/$name"
done

GIT_REVISION="$(git -c safe.directory="$PROJECT_DIR" -C "$PROJECT_DIR" rev-parse HEAD 2>/dev/null || printf 'unknown')"
cat > "$WORK_DIR/manifest.json" <<EOF
{"created_at":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","git_revision":"$GIT_REVISION","format":1,"tables":${#TABLES[@]}}
EOF

tar -C "$WORK_DIR" -czf "$ARCHIVE" .
chmod 600 "$ARCHIVE"
"$PROJECT_DIR/scripts/ops/verify-backup.sh" "$ARCHIVE"
sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"
chmod 600 "$ARCHIVE.sha256"

# Keep an off-VPS copy in a private Supabase Storage bucket.
curl --silent --show-error \
  "$SUPABASE_URL/storage/v1/bucket" \
  -X POST \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  --data '{"id":"backups","name":"backups","public":false}' \
  >/dev/null || true

curl --fail --silent --show-error \
  "$SUPABASE_URL/storage/v1/object/backups/database/$(basename "$ARCHIVE")" \
  -X POST \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/gzip" \
  -H "x-upsert: true" \
  --data-binary "@$ARCHIVE" \
  >/dev/null

curl --fail --silent --show-error \
  "$SUPABASE_URL/storage/v1/object/backups/database/$(basename "$ARCHIVE.sha256")" \
  -X POST \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: text/plain" \
  -H "x-upsert: true" \
  --data-binary "@$ARCHIVE.sha256" \
  >/dev/null

# Optional independent copy: encrypted locally before it leaves the VPS, then
# sent to any rclone-compatible provider (Cloudflare R2, S3, Backblaze B2...).
OFFSITE_REMOTE="$(read_env OFFSITE_RCLONE_REMOTE)"
AGE_RECIPIENT="$(read_env OFFSITE_AGE_RECIPIENT)"
if [[ -n "$OFFSITE_REMOTE" || -n "$AGE_RECIPIENT" ]]; then
  if [[ -z "$OFFSITE_REMOTE" || -z "$AGE_RECIPIENT" ]]; then
    echo "Both OFFSITE_RCLONE_REMOTE and OFFSITE_AGE_RECIPIENT are required" >&2
    exit 1
  fi
  command -v age >/dev/null || { echo "age is required for offsite encryption" >&2; exit 1; }
  command -v rclone >/dev/null || { echo "rclone is required for offsite backups" >&2; exit 1; }

  ENCRYPTED="$WORK_DIR/$(basename "$ARCHIVE").age"
  age --recipient "$AGE_RECIPIENT" --output "$ENCRYPTED" "$ARCHIVE"
  sha256sum "$ENCRYPTED" > "$ENCRYPTED.sha256"
  rclone copyto "$ENCRYPTED" "${OFFSITE_REMOTE%/}/$(basename "$ENCRYPTED")" --immutable
  rclone copyto "$ENCRYPTED.sha256" "${OFFSITE_REMOTE%/}/$(basename "$ENCRYPTED.sha256")" --immutable
  OFFSITE_KEEP_DAYS="$(read_env OFFSITE_KEEP_DAYS)"
  OFFSITE_KEEP_DAYS="${OFFSITE_KEEP_DAYS:-30}"
  rclone delete "$OFFSITE_REMOTE" \
    --min-age "${OFFSITE_KEEP_DAYS}d" \
    --include 'aq-supabase-*.tar.gz.age' \
    --include 'aq-supabase-*.tar.gz.age.sha256'
  date -u +%s > "$BACKUP_ROOT/.last-offsite-backup"
  chmod 600 "$BACKUP_ROOT/.last-offsite-backup"
fi

find "$BACKUP_ROOT" -maxdepth 1 -type f -name 'aq-supabase-*.tar.gz' -mtime "+$KEEP_DAYS" -delete
find "$BACKUP_ROOT" -maxdepth 1 -type f -name 'aq-supabase-*.tar.gz.sha256' -mtime "+$KEEP_DAYS" -delete

REMOTE_CUTOFF="$(date -u -d "$KEEP_DAYS days ago" +%Y-%m-%dT%H:%M:%SZ)"
REMOTE_INDEX="$WORK_DIR/remote-backups.json"
curl --fail --silent --show-error \
  "$SUPABASE_URL/storage/v1/object/list/backups" \
  -X POST \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  --data '{"prefix":"database","limit":1000,"offset":0,"sortBy":{"column":"created_at","order":"asc"}}' \
  > "$REMOTE_INDEX"

jq -r --arg cutoff "$REMOTE_CUTOFF" '.[] | select(.created_at < $cutoff) | "database/" + .name' "$REMOTE_INDEX" | while IFS= read -r old_backup; do
  [[ -z "$old_backup" ]] && continue
  delete_payload="$(jq -n --arg path "$old_backup" '{prefixes:[$path]}')"
  curl --fail --silent --show-error \
    "$SUPABASE_URL/storage/v1/object/backups" \
    -X DELETE \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    --data "$delete_payload" >/dev/null
done

echo "Backup created and copied off VPS: $ARCHIVE"
