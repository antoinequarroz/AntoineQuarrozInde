#!/usr/bin/env bash
set -euo pipefail

readonly ssh_target="${1:-antoine-vps}"
readonly remote_project="${2:-/home/ubuntu/antoinequarroz-vitrine}"
readonly keychain_account="antoinequarroz"
readonly keychain_service="antoinequarroz-posthog-source-map-api"

token="$(security find-generic-password -a "$keychain_account" -s "$keychain_service" -w)"
if [[ "$token" != phx_* || ${#token} -lt 40 ]]; then
  echo "PostHog source-map API key is missing from the macOS Keychain." >&2
  exit 1
fi

{
  printf 'token=%q\n' "$token"
  cat <<'REMOTE_SCRIPT'
set -euo pipefail
readonly project_dir="$1"
readonly env_file="$project_dir/.env"
tmp_file="$(mktemp "$project_dir/.env.posthog-source-maps.XXXXXX")"
trap 'rm -f "$tmp_file"' EXIT
sed '/^POSTHOG_SOURCE_MAP_API_KEY=/d; /^POSTHOG_HOST=/d' "$env_file" > "$tmp_file"
printf 'POSTHOG_SOURCE_MAP_API_KEY=%s\n' "$token" >> "$tmp_file"
printf 'POSTHOG_HOST=https://eu.posthog.com\n' >> "$tmp_file"
chmod 600 "$tmp_file"
mv "$tmp_file" "$env_file"
trap - EXIT
unset token
grep -q '^POSTHOG_SOURCE_MAP_API_KEY=phx_' "$env_file"
grep -q '^POSTHOG_HOST=https://eu.posthog.com$' "$env_file"
REMOTE_SCRIPT
} | ssh -o BatchMode=yes "$ssh_target" bash -s -- "$remote_project"

unset token
echo "PostHog source-map secret installed on $ssh_target."
