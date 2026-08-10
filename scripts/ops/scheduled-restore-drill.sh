#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="${1:-$(pwd)}"
ENV_FILE="$PROJECT_DIR/.env"
read_env() { sed -n "s/^${1}=//p" "$ENV_FILE" | tail -n 1 | sed 's/^"//;s/"$//'; }
REMOTE="$(read_env OFFSITE_RCLONE_REMOTE)"
IDENTITY="$(read_env OFFSITE_AGE_IDENTITY_FILE)"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/antoinequarroz}"
[[ -n "$REMOTE" && -n "$IDENTITY" ]] || { echo "Offsite restore drill is not configured" >&2; exit 1; }
"$PROJECT_DIR/scripts/ops/restore-offsite-drill.sh" "$REMOTE" "$IDENTITY" "$PROJECT_DIR"
date -u +%s > "$BACKUP_ROOT/.last-restore-drill"
chmod 600 "$BACKUP_ROOT/.last-restore-drill"
