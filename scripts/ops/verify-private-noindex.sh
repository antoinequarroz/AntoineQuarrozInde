#!/usr/bin/env bash
set -euo pipefail

readonly base_url="${1:-https://www.antoinequarroz.ch}"
readonly private_paths=(
  '/admin/login'
  '/admin'
  '/admin/seo-proof-not-found'
  '/portal/login'
  '/portal'
  '/offline'
)

validate_base_url() {
  local value="$1"
  [[ "$value" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]+)?/?$ ]]
}

if ! validate_base_url "$base_url"; then
  echo "Expected an HTTP(S) origin URL without a path, query or credentials." >&2
  exit 64
fi

readonly origin="${base_url%/}"

for private_path in "${private_paths[@]}"; do
  headers="$(curl --silent --show-error --max-time 12 --output /dev/null --dump-header - "${origin}${private_path}")"
  status="$(awk 'toupper($1) ~ /^HTTP\// { value=$2 } END { print value }' <<<"$headers")"
  robots="$(awk 'tolower($1) == "x-robots-tag:" { $1=""; sub(/\r$/, ""); print tolower($0) }' <<<"$headers")"

  if [[ ! "$status" =~ ^[234][0-9][0-9]$ ]]; then
    echo "Private route ${private_path} returned an invalid status (${status:-no status})." >&2
    exit 1
  fi

  if ! grep -Eq '(^|[,:[:space:]])noindex([,[:space:]]|$)' <<<"$robots" \
    || ! grep -Eq '(^|[,:[:space:]])nofollow([,[:space:]]|$)' <<<"$robots"; then
    echo "Private route ${private_path} is missing X-Robots-Tag: noindex, nofollow." >&2
    exit 1
  fi
done

echo "Private routes are non-indexable on ${origin}."
