#!/usr/bin/env bash

set -euo pipefail

env_file="${1:?environment file path is required}"
token_file="${2:?token file path is required}"

cleanup() {
  rm -f -- "$token_file"
}
trap cleanup EXIT

test -f "$env_file"
test -f "$token_file"

token="$(tr -d '\r\n' < "$token_file")"
if [[ ! "$token" =~ ^[a-f0-9]{64}$ ]]; then
  echo "HERMES_READ_TOKEN must be a 64-character lowercase hexadecimal secret" >&2
  exit 1
fi

env_dir="$(dirname -- "$env_file")"
temp_file="$(mktemp "$env_dir/.env.hermes.XXXXXX")"
trap 'rm -f -- "$temp_file"; cleanup' EXIT
chmod 600 "$temp_file"

awk -v token="$token" '
  BEGIN { replaced = 0 }
  /^HERMES_READ_TOKEN=/ {
    if (!replaced) {
      print "HERMES_READ_TOKEN=" token
      replaced = 1
    }
    next
  }
  { print }
  END {
    if (!replaced) {
      print "HERMES_READ_TOKEN=" token
    }
  }
' "$env_file" > "$temp_file"

mv -f -- "$temp_file" "$env_file"
chmod 600 "$env_file"
trap cleanup EXIT

