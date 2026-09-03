#!/usr/bin/env bash
set -euo pipefail

readonly apex_url="${1:-https://antoinequarroz.ch}"
readonly canonical_url="${2:-https://www.antoinequarroz.ch}"
readonly verification_path='/aq-seo-001/path?utm_source=verification'

validate_base_url() {
  local value="$1"
  [[ "$value" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]+)?/?$ ]]
}

if ! validate_base_url "$apex_url" || ! validate_base_url "$canonical_url"; then
  echo "Expected HTTP(S) origin URLs without paths, queries or credentials." >&2
  exit 64
fi

readonly apex_origin="${apex_url%/}"
readonly canonical_origin="${canonical_url%/}"
readonly expected_location="${canonical_origin}${verification_path}"

headers="$(curl --silent --show-error --max-time 12 --output /dev/null --dump-header - "${apex_origin}${verification_path}")"
status="$(awk 'toupper($1) ~ /^HTTP\// { print $2; exit }' <<<"$headers")"
location="$(awk 'tolower($1) == "location:" { value=$2; sub(/\r$/, "", value); print value; exit }' <<<"$headers")"

if [[ "$status" != "301" && "$status" != "308" ]]; then
  echo "Apex did not return a permanent redirect (received ${status:-no status})." >&2
  exit 1
fi

if [[ "$location" != "$expected_location" ]]; then
  echo "Apex redirect target mismatch: expected $expected_location, received ${location:-no Location header}." >&2
  exit 1
fi

curl --fail --silent --show-error --max-time 12 --output /dev/null "${canonical_origin}/"

echo "Canonical domain is healthy: $apex_origin redirects permanently to $canonical_origin with URI preservation."
