#!/usr/bin/env bash
set -Eeuo pipefail

readonly archive="${1:?Usage: full-recovery-drill.sh /path/to/backup.tar.gz [project-dir]}"
readonly repo_root="${2:-$(pwd)}"
readonly temp_parent="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
readonly temp_root="$(mktemp -d "$temp_parent/aq-full-recovery.XXXXXX")"
readonly restore_root="$temp_root/restore"
readonly project_root="$temp_root/project"
readonly project_id="aq-recovery-$$-${RANDOM}"
readonly supabase_cli=(npx --no-install supabase)

unset SUPABASE_ACCESS_TOKEN

cleanup() {
  status=$?
  trap - EXIT INT TERM
  "${supabase_cli[@]}" stop --workdir "$project_root" --no-backup >/dev/null 2>&1 || true
  case "$temp_root" in
    "$temp_parent"/aq-full-recovery.*) rm -rf -- "$temp_root" ;;
    *) echo "Refusing to remove an unexpected temporary path: $temp_root" >&2 ;;
  esac
  exit "$status"
}
trap cleanup EXIT INT TERM

for executable in docker jq tar; do
  command -v "$executable" >/dev/null 2>&1 \
    || { echo "Missing recovery dependency: $executable" >&2; exit 1; }
done

"$repo_root/scripts/ops/verify-backup.sh" "$archive"
install -d "$restore_root" "$project_root/supabase/migrations"
tar -xzf "$archive" -C "$restore_root"

# Rebuild a disposable database exactly like the migration preflight: the
# versioned baseline comes first, then the production migration history. The
# temporary project is deliberately unlinked from Supabase production.
install -m 600 "$repo_root/supabase/config.toml" "$project_root/supabase/config.toml"
sed -i.bak "s/^project_id = .*/project_id = \"$project_id\"/" "$project_root/supabase/config.toml"
rm -f -- "$project_root/supabase/config.toml.bak"
install -m 600 "$repo_root/supabase/schema.sql" \
  "$project_root/supabase/migrations/20260701000000_initial_schema.sql"
install -m 600 "$repo_root/supabase/tests/fixtures/platform_compatibility.sql" \
  "$project_root/supabase/migrations/20260701000001_platform_compatibility.sql"
cp "$repo_root"/supabase/migrations/*.sql "$project_root/supabase/migrations/"

"${supabase_cli[@]}" start \
  --workdir "$project_root" \
  --exclude gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
"${supabase_cli[@]}" db reset --local --no-seed --workdir "$project_root"

db_container="$(docker ps --filter "name=supabase_db_$project_id" --format '{{.Names}}' | head -n 1)"
[[ -n "$db_container" ]] || { echo "Disposable recovery database was not found" >&2; exit 1; }

db_user="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$db_container" | sed -n 's/^POSTGRES_USER=//p' | head -n 1)"
db_name="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$db_container" | sed -n 's/^POSTGRES_DB=//p' | head -n 1)"
db_password="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$db_container" | sed -n 's/^POSTGRES_PASSWORD=//p' | head -n 1)"
[[ -n "$db_user" && -n "$db_name" && -n "$db_password" ]] \
  || { echo "Disposable database credentials are unavailable" >&2; exit 1; }

psql_local() {
  docker exec -i -e PGPASSWORD="$db_password" "$db_container" \
    psql --no-psqlrc --set ON_ERROR_STOP=1 -U "$db_user" -d "$db_name" "$@"
}

docker exec "$db_container" rm -rf /tmp/aq-restore
docker cp "$restore_root" "$db_container:/tmp/aq-restore"

# The independent backup intentionally excludes password hashes and sessions.
# Restore only identity UUIDs and metadata so every application foreign key can
# be proven in a disposable database without creating usable copied accounts.
psql_local <<'SQL'
insert into auth.users (
  id, email, created_at, updated_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
)
select
  id,
  email,
  coalesce(created_at, now()),
  coalesce(updated_at, created_at, now()),
  last_sign_in_at,
  coalesce(app_metadata, '{}'::jsonb),
  '{}'::jsonb,
  'authenticated',
  'authenticated'
from jsonb_to_recordset(pg_read_file('/tmp/aq-restore/auth-users.json')::jsonb) as restored_user(
  id uuid,
  email text,
  created_at timestamptz,
  updated_at timestamptz,
  last_sign_in_at timestamptz,
  app_metadata jsonb
)
on conflict (id) do nothing;

insert into auth.users (
  id, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
)
select
  id,
  now(),
  now(),
  '{"recovery_stub":true}'::jsonb,
  '{}'::jsonb,
  'authenticated',
  'authenticated'
from (
  select user_id as id
  from jsonb_to_recordset(pg_read_file('/tmp/aq-restore/organization_memberships.json')::jsonb)
    as membership(user_id uuid)
  union
  select portal_user_id
  from jsonb_to_recordset(pg_read_file('/tmp/aq-restore/clients.json')::jsonb)
    as client(portal_user_id uuid)
  union
  select case_study_approved_by
  from jsonb_to_recordset(pg_read_file('/tmp/aq-restore/projects.json')::jsonb)
    as project(case_study_approved_by uuid)
  union
  select actor_user_id
  from jsonb_to_recordset(pg_read_file('/tmp/aq-restore/audit_logs.json')::jsonb)
    as audit_log(actor_user_id uuid)
  union
  select accepted_by_user_id
  from jsonb_to_recordset(pg_read_file('/tmp/aq-restore/quotes.json')::jsonb)
    as quote(accepted_by_user_id uuid)
  union
  select created_by_user_id
  from jsonb_to_recordset(pg_read_file('/tmp/aq-restore/project_time_entries.json')::jsonb)
    as time_entry(created_by_user_id uuid)
  union
  select created_by_user_id
  from jsonb_to_recordset(pg_read_file('/tmp/aq-restore/payment_checkout_sessions.json')::jsonb)
    as checkout_session(created_by_user_id uuid)
) as referenced_user
where id is not null
on conflict (id) do nothing;
SQL

tables=(
  organizations organization_memberships clients projects tasks appointments
  quotes quote_items invoices invoice_items invoice_payments articles reviews contact_messages
  marketing_events admin_saved_views application_errors payment_checkout_sessions
  project_milestones project_time_entries project_notes project_deliverables
  recurring_invoice_profiles recurring_invoice_runs audit_logs
)

# Production guards correctly reject direct writes that bypass audited RPCs.
# A disaster restore must replay the already-audited rows verbatim, so disable
# only application/user triggers while keeping PostgreSQL FK triggers active.
psql_local <<'SQL'
do $$
declare
  restored_table record;
begin
  for restored_table in
    select table_schema, table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  loop
    execute format('alter table %I.%I disable trigger user', restored_table.table_schema, restored_table.table_name);
  end loop;
end
$$;
SQL

for table in "${tables[@]}"; do
  [[ "$table" =~ ^[a-z_]+$ ]] || { echo "Unsafe table name: $table" >&2; exit 1; }
  expected_rows="$(jq -r --arg table "$table" '.table_rows[$table] // empty' "$restore_root/manifest.json")"
  [[ "$expected_rows" =~ ^[0-9]+$ ]] \
    || { echo "Backup manifest has no row count for $table" >&2; exit 1; }
  (( expected_rows == 0 )) && continue

  psql_local -c "insert into public.$table overriding system value select * from jsonb_populate_recordset(null::public.$table, pg_read_file('/tmp/aq-restore/$table.json')::jsonb);"
done

psql_local <<'SQL'
do $$
declare
  restored_table record;
begin
  for restored_table in
    select table_schema, table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  loop
    execute format('alter table %I.%I enable trigger user', restored_table.table_schema, restored_table.table_name);
  end loop;
end
$$;
SQL

# Bring generated identity sequences forward so the restored copy also proves
# that a subsequent application insert would not collide with recovered rows.
psql_local <<'SQL'
do $$
declare
  item record;
  maximum bigint;
begin
  for item in
    select table_schema, table_name, column_name,
           pg_get_serial_sequence(format('%I.%I', table_schema, table_name), column_name) as sequence_name
      from information_schema.columns
     where table_schema = 'public'
       and (is_identity = 'YES' or column_default like 'nextval(%')
  loop
    if item.sequence_name is null then
      continue;
    end if;
    execute format('select max(%I) from %I.%I', item.column_name, item.table_schema, item.table_name)
      into maximum;
    if maximum is not null then
      perform setval(item.sequence_name, maximum, true);
    end if;
  end loop;
end
$$;
SQL

for table in "${tables[@]}"; do
  expected_rows="$(jq -r --arg table "$table" '.table_rows[$table]' "$restore_root/manifest.json")"
  actual_rows="$(psql_local -Atc "select count(*) from public.$table")"
  [[ "$actual_rows" -eq "$expected_rows" ]] \
    || { echo "Recovered row count mismatch for $table: expected $expected_rows, found $actual_rows" >&2; exit 1; }
done

expected_auth_users="$(jq -r '.auth_users' "$restore_root/manifest.json")"
actual_auth_users="$(psql_local -Atc "
  select count(*)
  from jsonb_to_recordset(pg_read_file('/tmp/aq-restore/auth-users.json')::jsonb) as inventory(id uuid)
  join auth.users on users.id = inventory.id
")"
[[ "$actual_auth_users" -eq "$expected_auth_users" ]] \
  || { echo "Recovered Auth inventory mismatch: expected $expected_auth_users, found $actual_auth_users" >&2; exit 1; }
recovery_stubs="$(psql_local -Atc "select count(*) from auth.users where raw_app_meta_data @> '{\"recovery_stub\":true}'::jsonb")"

"${supabase_cli[@]}" db lint --local --workdir "$project_root" --schema public --level error --fail-on error

echo "Full application-data recovery drill passed in an isolated local database."
echo "Recovered ${#tables[@]} tables, $actual_auth_users inventoried Auth identities and $recovery_stubs inert reference stubs; Storage object bytes were checksum-verified by verify-backup.sh."
