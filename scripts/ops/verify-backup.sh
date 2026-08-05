#!/usr/bin/env bash
set -euo pipefail

ARCHIVE="${1:?Usage: verify-backup.sh /path/to/backup.tar.gz}"
[[ -f "$ARCHIVE" ]] || { echo "Backup archive not found: $ARCHIVE" >&2; exit 1; }
if [[ -f "$ARCHIVE.sha256" ]]; then
  (cd "$(dirname "$ARCHIVE")" && sha256sum --check "$(basename "$ARCHIVE.sha256")")
fi
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

tar -xzf "$ARCHIVE" -C "$WORK_DIR"
for required in manifest.json organizations.json clients.json projects.json quotes.json quote_items.json invoices.json invoice_items.json; do
  [[ -s "$WORK_DIR/$required" ]] || { echo "Missing or empty backup file: $required" >&2; exit 1; }
  jq empty "$WORK_DIR/$required"
done

echo "Backup verified: $(jq -c . "$WORK_DIR/manifest.json")"
