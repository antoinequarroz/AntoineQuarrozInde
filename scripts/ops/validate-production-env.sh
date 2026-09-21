#!/usr/bin/env bash
set -Eeuo pipefail

readonly env_file="${1:-.env}"

if [[ ! -f "$env_file" ]]; then
  echo "Production environment file is missing: $env_file" >&2
  exit 78
fi

read_env_value() {
  local name="$1"
  awk -F= -v key="$name" '
    $1 == key {
      value = substr($0, index($0, "=") + 1)
    }
    END {
      print value
    }
  ' "$env_file"
}

required_names=(
  SUPABASE_URL
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  HERMES_READ_TOKEN
  HERMES_PUBLISH_TOKEN
  ENSEMBLE_SUPABASE_ANON_KEY
)

missing_names=()
for name in "${required_names[@]}"; do
  if [[ -z "$(read_env_value "$name")" ]]; then
    missing_names+=("$name")
  fi
done

if ((${#missing_names[@]} > 0)); then
  printf 'Production environment is incomplete; refusing to restart containers. Missing: %s\n' \
    "${missing_names[*]}" >&2
  exit 78
fi

supabase_url="$(read_env_value SUPABASE_URL)"
read_token="$(read_env_value HERMES_READ_TOKEN)"
publish_token="$(read_env_value HERMES_PUBLISH_TOKEN)"

[[ "$supabase_url" =~ ^https://[A-Za-z0-9.-]+\.supabase\.co/?$ ]] || {
  echo "SUPABASE_URL is invalid; refusing to restart containers." >&2
  exit 78
}
[[ "$read_token" =~ ^[a-f0-9]{64}$ ]] || {
  echo "HERMES_READ_TOKEN is invalid; refusing to restart containers." >&2
  exit 78
}
[[ "$publish_token" =~ ^[a-f0-9]{64}$ ]] || {
  echo "HERMES_PUBLISH_TOKEN is invalid; refusing to restart containers." >&2
  exit 78
}

echo "Production runtime environment is complete."
