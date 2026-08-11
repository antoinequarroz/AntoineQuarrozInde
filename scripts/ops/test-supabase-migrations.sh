#!/usr/bin/env bash
set -Eeuo pipefail

readonly repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
readonly temp_parent="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
readonly temp_root="$(mktemp -d "$temp_parent/aq059-supabase.XXXXXX")"
readonly project_root="$temp_root/project"
readonly cli_home="$temp_root/home"
readonly project_id="aq059-${BASHPID}-${RANDOM}"
readonly supabase_cli=(npx --no-install supabase)

# An isolated HOME prevents the local preflight from reading a developer's
# linked Supabase profile or access token.
mkdir -p "$cli_home"
chmod 700 "$cli_home" 2>/dev/null || true
export HOME="$cli_home"
export USERPROFILE="$cli_home"

cleanup() {
  "${supabase_cli[@]}" stop --workdir "$project_root" --no-backup >/dev/null 2>&1 || true
  case "$temp_root" in
    "$temp_parent"/aq059-supabase.*) rm -rf -- "$temp_root" ;;
    *) echo "Refusing to remove an unexpected temporary path: $temp_root" >&2 ;;
  esac
}
trap cleanup EXIT INT TERM

install -d "$project_root/supabase/migrations" "$project_root/supabase/tests/database"
install -m 600 "$repo_root/supabase/config.toml" "$project_root/supabase/config.toml"
sed -i "s/^project_id = .*/project_id = \"$project_id\"/" "$project_root/supabase/config.toml"
install -m 600 "$repo_root/supabase/schema.sql" \
  "$project_root/supabase/migrations/20260701000000_initial_schema.sql"
install -m 600 "$repo_root/supabase/tests/fixtures/platform_compatibility.sql" \
  "$project_root/supabase/migrations/20260701000001_platform_compatibility.sql"
cp "$repo_root"/supabase/migrations/*.sql "$project_root/supabase/migrations/"
cp "$repo_root"/supabase/tests/database/*.sql "$project_root/supabase/tests/database/"

"${supabase_cli[@]}" start \
  --workdir "$project_root" \
  --exclude gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
"${supabase_cli[@]}" db reset --local --no-seed --workdir "$project_root"
"${supabase_cli[@]}" test db --local --workdir "$project_root" supabase/tests/database

echo "Supabase schema, migrations and pgTAP checks passed in an ephemeral local database."
