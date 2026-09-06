#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="${1:-$(pwd)}"
ENV_FILE="$PROJECT_DIR/.env"
read_env() { sed -n "s/^${1}=//p" "$ENV_FILE" | tail -n 1 | sed 's/^"//;s/"$//'; }
REMOTE="$(read_env OFFSITE_RCLONE_REMOTE)"
IDENTITY="$(read_env OFFSITE_AGE_IDENTITY_FILE)"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/antoinequarroz}"

if [[ -n "$REMOTE" && -n "$IDENTITY" ]]; then
  "$PROJECT_DIR/scripts/ops/restore-offsite-drill.sh" "$REMOTE" "$IDENTITY" "$PROJECT_DIR"
  install -d -m 700 "$BACKUP_ROOT"
  date -u +%s > "$BACKUP_ROOT/.last-restore-drill"
  chmod 600 "$BACKUP_ROOT/.last-restore-drill"
  exit 0
fi

# The age private key should normally stay outside the VPS. In that secure
# configuration, still prove the recoverability of the remote private copy in
# Supabase Storage instead of silently skipping the monthly drill.
"$PROJECT_DIR/scripts/ops/restore-supabase-copy-drill.sh" "$PROJECT_DIR"
