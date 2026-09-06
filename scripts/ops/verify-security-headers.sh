#!/usr/bin/env bash
set -euo pipefail

readonly base_url="${1:-https://www.antoinequarroz.ch}"

if [[ ! "$base_url" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]+)?/?$ ]]; then
  echo "Expected an HTTP(S) origin URL without a path, query or credentials." >&2
  exit 64
fi

headers="$(
  curl --fail --silent --show-error --max-time 12 \
    --output /dev/null --dump-header - "${base_url%/}/"
)"

header_value() {
  local name="$1"
  awk -v name="$name" '
    tolower($1) == tolower(name) ":" {
      sub(/^[^:]+:[[:space:]]*/, "")
      sub(/\r$/, "")
      print
      exit
    }
  ' <<<"$headers"
}

require_exact_header() {
  local name="$1"
  local expected="$2"
  local actual
  actual="$(header_value "$name")"

  if [[ "$actual" != "$expected" ]]; then
    echo "$name mismatch: expected '$expected', received '${actual:-missing}'." >&2
    exit 1
  fi
}

require_exact_header 'Content-Security-Policy' "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://challenges.cloudflare.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://plausible.io https://*.supabase.co wss://*.supabase.co https://prod.spline.design https://unpkg.com https://challenges.cloudflare.com; frame-src 'self' blob: https://challenges.cloudflare.com; worker-src 'self' blob:; media-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests"
require_exact_header 'Permissions-Policy' 'camera=(), geolocation=(), microphone=()'
require_exact_header 'Referrer-Policy' 'strict-origin-when-cross-origin'
require_exact_header 'Strict-Transport-Security' 'max-age=31536000'
require_exact_header 'X-Content-Type-Options' 'nosniff'
require_exact_header 'X-Frame-Options' 'DENY'

echo "Security headers are active on ${base_url%/}."
