#!/usr/bin/env bash
set -euo pipefail

ARCHIVE="${1:?Usage: restore-drill.sh /path/to/backup.tar.gz}"
PROJECT_DIR="${2:-$(pwd)}"
"$PROJECT_DIR/scripts/ops/verify-backup.sh" "$ARCHIVE"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
tar -xzf "$ARCHIVE" -C "$WORK_DIR"

for file in "$WORK_DIR"/*.json; do
  [[ "$(basename "$file")" == "manifest.json" ]] && continue
  jq -e 'type == "array"' "$file" >/dev/null
done

jq -n \
  --slurpfile clients "$WORK_DIR/clients.json" \
  --slurpfile auth "$WORK_DIR/auth-users.json" \
  --slurpfile projects "$WORK_DIR/projects.json" \
  --slurpfile quotes "$WORK_DIR/quotes.json" \
  --slurpfile invoices "$WORK_DIR/invoices.json" '
  ($clients[0] | map(.id) | unique) as $client_ids |
  ($auth[0] | map(.id) | unique) as $auth_ids |
  [
    ($projects[0][] | .client_id as $foreign_id | select($foreign_id != null and (($client_ids | index($foreign_id)) == null)) | {table:"projects", id, missing_client_id:$foreign_id}),
    ($quotes[0][] | .client_id as $foreign_id | select($foreign_id != null and (($client_ids | index($foreign_id)) == null)) | {table:"quotes", id, missing_client_id:$foreign_id}),
    ($invoices[0][] | .client_id as $foreign_id | select($foreign_id != null and (($client_ids | index($foreign_id)) == null)) | {table:"invoices", id, missing_client_id:$foreign_id}),
    ($clients[0][] | .portal_user_id as $foreign_id | select($foreign_id != null and (($auth_ids | index($foreign_id)) == null)) | {table:"clients", id, missing_auth_user_id:$foreign_id})
  ]' > "$WORK_DIR/orphans.json"

ORPHANS="$(jq 'length' "$WORK_DIR/orphans.json")"
[[ "$ORPHANS" -eq 0 ]] || { jq . "$WORK_DIR/orphans.json" >&2; echo "Restore drill failed: orphaned business rows" >&2; exit 1; }

for required in supabase/schema.sql supabase/migrations; do
  [[ -e "$PROJECT_DIR/$required" ]] || { echo "Restore drill failed: missing $required" >&2; exit 1; }
done

echo "Restore drill passed: archive can be extracted, parsed and linked to the versioned schema."
