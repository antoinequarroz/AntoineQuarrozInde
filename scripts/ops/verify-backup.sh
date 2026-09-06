#!/usr/bin/env bash
set -euo pipefail

ARCHIVE="${1:?Usage: verify-backup.sh /path/to/backup.tar.gz}"
[[ -f "$ARCHIVE" ]] || { echo "Backup archive not found: $ARCHIVE" >&2; exit 1; }
if [[ -f "$ARCHIVE.sha256" ]]; then
  expected_checksum="$(awk 'NR == 1 { print $1 }' "$ARCHIVE.sha256")"
  actual_checksum="$(sha256sum "$ARCHIVE" | awk '{ print $1 }')"
  [[ "$expected_checksum" =~ ^[0-9a-f]{64}$ && "$actual_checksum" == "$expected_checksum" ]] \
    || { echo "Backup checksum mismatch" >&2; exit 1; }
fi
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

tar -xzf "$ARCHIVE" -C "$WORK_DIR"
for required in manifest.json organizations.json clients.json projects.json quotes.json quote_items.json invoices.json invoice_items.json invoice_payments.json; do
  [[ -s "$WORK_DIR/$required" ]] || { echo "Missing or empty backup file: $required" >&2; exit 1; }
  jq empty "$WORK_DIR/$required"
done

manifest_format="$(jq -r '.format // 0' "$WORK_DIR/manifest.json")"
if (( manifest_format >= 3 )); then
  jq -e '
    .format == 3
    and (.created_at | type == "string")
    and (.git_revision | type == "string")
    and (.table_rows | type == "object")
    and (.tables == (.table_rows | length))
    and (.auth_users | type == "number")
    and (.storage_objects | type == "number")
  ' "$WORK_DIR/manifest.json" >/dev/null

  while IFS=$'\t' read -r table expected_rows; do
    table_file="$WORK_DIR/$table.json"
    [[ -s "$table_file" ]] || { echo "Missing table backup: $table" >&2; exit 1; }
    actual_rows="$(jq 'length' "$table_file")"
    [[ "$actual_rows" -eq "$expected_rows" ]] \
      || { echo "Row count mismatch for $table: expected $expected_rows, found $actual_rows" >&2; exit 1; }
  done < <(jq -r '.table_rows | to_entries[] | [.key, (.value | tostring)] | @tsv' "$WORK_DIR/manifest.json")

  actual_auth_users="$(jq 'length' "$WORK_DIR/auth-users.json")"
  expected_auth_users="$(jq '.auth_users' "$WORK_DIR/manifest.json")"
  [[ "$actual_auth_users" -eq "$expected_auth_users" ]] \
    || { echo "Auth inventory count mismatch" >&2; exit 1; }

  expected_storage_objects="$(jq '.storage_objects' "$WORK_DIR/manifest.json")"
  actual_storage_objects="$(find "$WORK_DIR/storage/media/uploads" -type f | wc -l | tr -d ' ')"
  [[ "$actual_storage_objects" -eq "$expected_storage_objects" ]] \
    || { echo "Storage object count mismatch: expected $expected_storage_objects, found $actual_storage_objects" >&2; exit 1; }
fi

echo "Backup verified: $(jq -c . "$WORK_DIR/manifest.json")"
