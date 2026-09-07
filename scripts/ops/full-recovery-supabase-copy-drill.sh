#!/usr/bin/env bash
set -euo pipefail

readonly project_dir="${1:-$(pwd)}"
readonly env_file="$project_dir/.env"

read_env() {
  local key="$1"
  local value
  value="$(sed -n "s/^${key}=//p" "$env_file" | tail -n 1)"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

[[ -f "$env_file" ]] || { echo "Missing environment file: $env_file" >&2; exit 1; }
supabase_url="$(read_env SUPABASE_URL)"
service_key="$(read_env SUPABASE_SERVICE_ROLE_KEY)"
[[ "$supabase_url" == https://* && -n "$service_key" ]] \
  || { echo "Supabase backup access is not configured" >&2; exit 1; }

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

curl --fail --silent --show-error \
  "$supabase_url/storage/v1/object/list/backups" \
  -X POST \
  -H "apikey: $service_key" \
  -H "Authorization: Bearer $service_key" \
  -H "Content-Type: application/json" \
  --data '{"prefix":"database","limit":1000,"offset":0,"sortBy":{"column":"name","order":"desc"}}' \
  > "$work_dir/index.json"

latest="$(jq -r '[.[] | .name | select(test("^aq-supabase-[0-9]{8}T[0-9]{6}Z\\.tar\\.gz$"))] | sort | last // empty' "$work_dir/index.json")"
[[ -n "$latest" ]] || { echo "No remote Supabase backup archive found" >&2; exit 1; }

for object in "$latest" "$latest.sha256"; do
  curl --fail --silent --show-error \
    "$supabase_url/storage/v1/object/authenticated/backups/database/$object" \
    -H "apikey: $service_key" \
    -H "Authorization: Bearer $service_key" \
    -o "$work_dir/$object"
done

"$project_dir/scripts/ops/full-recovery-drill.sh" "$work_dir/$latest" "$project_dir"
echo "Remote Supabase full recovery drill passed: $latest"
