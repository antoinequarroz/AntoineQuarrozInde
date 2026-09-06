#!/usr/bin/env bash
set -Eeuo pipefail

readonly repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
readonly artifact_dir="${1:-}"
readonly temp_parent="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
readonly expected_sha="${GITHUB_SHA:-$(git -C "$repo_root" rev-parse HEAD)}"
readonly supabase_cli=(npx --no-install supabase)

if [[ -z "$artifact_dir" || "$artifact_dir" != /* ]]; then
  echo "Expected an absolute artifact directory." >&2
  exit 64
fi
if [[ ! "$expected_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Expected a full lowercase Git commit SHA." >&2
  exit 64
fi

for required_name in SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF SUPABASE_BACKUP_AGE_RECIPIENT; do
  if [[ -z "${!required_name:-}" ]]; then
    echo "Missing required Production setting: $required_name" >&2
    exit 64
  fi
done
if [[ ! "$SUPABASE_PROJECT_REF" =~ ^[a-z0-9]{20}$ ]]; then
  echo "SUPABASE_PROJECT_REF has an invalid format." >&2
  exit 64
fi
if [[ ! "$SUPABASE_BACKUP_AGE_RECIPIENT" =~ ^age1[0-9a-z]{20,}$ ]]; then
  echo "SUPABASE_BACKUP_AGE_RECIPIENT has an invalid format." >&2
  exit 64
fi

for executable in node jq tar age sha256sum; do
  command -v "$executable" >/dev/null || { echo "$executable is required for database promotion." >&2; exit 69; }
done

install -d -m 700 "$artifact_dir"
readonly temp_root="$(mktemp -d "$temp_parent/aq060-supabase.XXXXXX")"
readonly project_root="$temp_root/project"
readonly clear_backup="$temp_root/clear-backup"
readonly list_before="$temp_root/migration-list-before.txt"
readonly list_after="$temp_root/migration-list-after.txt"
readonly manifest="$artifact_dir/migration-manifest.json"

cleanup() {
  case "$temp_root" in
    "$temp_parent"/aq060-supabase.*) rm -rf -- "$temp_root" ;;
    *) echo "Refusing to remove an unexpected temporary path." >&2 ;;
  esac
}
trap cleanup EXIT INT TERM

install -d -m 700 "$project_root/supabase/migrations" "$clear_backup"
install -m 600 "$repo_root/supabase/config.toml" "$project_root/supabase/config.toml"
cp "$repo_root"/supabase/migrations/*.sql "$project_root/supabase/migrations/"

run_supabase() {
  local label="$1"
  shift
  if ! "${supabase_cli[@]}" "$@" 2>"$temp_root/supabase-error.log"; then
    echo "Supabase $label failed; production was not advanced." >&2
    return 1
  fi
}

read_plan() {
  local source_file="$1"
  node --disable-warning=ExperimentalWarning --experimental-strip-types \
    "$repo_root/shared/utils/supabaseMigrationPlan.ts" "$source_file"
}

write_manifest() {
  local state="$1"
  local plan_json="$2"
  local backup_created="$3"
  jq -n \
    --arg state "$state" \
    --arg gitRevision "$expected_sha" \
    --arg createdAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson backupCreated "$backup_created" \
    --argjson plan "$plan_json" \
    '{format:1,state:$state,git_revision:$gitRevision,created_at:$createdAt,backup_created:$backupCreated,plan:$plan}' \
    > "$manifest"
  chmod 600 "$manifest"
}

run_supabase "project link" link \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --workdir "$project_root" >/dev/null
run_supabase "migration history check" migration list --linked \
  --workdir "$project_root" > "$list_before"

set +e
plan_json="$(read_plan "$list_before")"
plan_status=$?
set -e
if (( plan_status != 0 )); then
  echo "Supabase migration history is divergent or unreadable; refusing production changes." >&2
  exit 65
fi

run_supabase "migration dry-run" db push --linked --dry-run \
  --workdir "$project_root" >/dev/null

pending_count="$(jq -r '.pendingVersions | length' <<<"$plan_json")"
if (( pending_count == 0 )); then
  write_manifest "aligned" "$plan_json" false
  echo "Supabase production migration history is already aligned."
  exit 0
fi

write_manifest "backup_started" "$plan_json" false
run_supabase "schema backup" db dump --linked \
  --schema public \
  --file "$clear_backup/public-schema.sql" \
  --workdir "$project_root" >/dev/null
run_supabase "data backup" db dump --linked \
  --schema public \
  --data-only --use-copy \
  --file "$clear_backup/public-data.sql" \
  --workdir "$project_root" >/dev/null
# Storage object bytes are covered by the independent offsite backup job. Keep
# the managed bucket metadata here as well so a migration that changes bucket
# visibility or limits has an immediately restorable pre-change snapshot.
run_supabase "storage metadata backup" db dump --linked \
  --schema storage \
  --data-only --use-copy \
  --exclude storage.objects \
  --exclude storage.migrations \
  --file "$clear_backup/storage-metadata.sql" \
  --workdir "$project_root" >/dev/null
install -m 600 "$manifest" "$clear_backup/manifest.json"

readonly backup_name="supabase-pre-migration-${expected_sha}.tar.gz.age"
tar -C "$clear_backup" -czf "$temp_root/pre-migration.tar.gz" .
age --recipient "$SUPABASE_BACKUP_AGE_RECIPIENT" \
  --output "$artifact_dir/$backup_name" \
  "$temp_root/pre-migration.tar.gz"
chmod 600 "$artifact_dir/$backup_name"
(cd "$artifact_dir" && sha256sum "$backup_name" > "$backup_name.sha256")
chmod 600 "$artifact_dir/$backup_name.sha256"
rm -rf -- "$clear_backup" "$temp_root/pre-migration.tar.gz"
write_manifest "backup_ready" "$plan_json" true

if ! run_supabase "migration push" db push --linked --yes \
  --workdir "$project_root" >/dev/null; then
  write_manifest "push_failed" "$plan_json" true
  exit 1
fi

run_supabase "post-push history check" migration list --linked \
  --workdir "$project_root" > "$list_after"
set +e
post_plan_json="$(read_plan "$list_after")"
post_status=$?
set -e
if (( post_status != 0 )) || [[ "$(jq -r '.status' <<<"$post_plan_json")" != "aligned" ]]; then
  write_manifest "verification_failed" "$post_plan_json" true
  echo "Supabase migrations ran but the remote history is not aligned; application deployment is blocked." >&2
  exit 65
fi
run_supabase "post-push dry-run" db push --linked --dry-run \
  --workdir "$project_root" >/dev/null

write_manifest "promoted" "$plan_json" true
echo "Supabase production migrations promoted: $pending_count version(s)."
