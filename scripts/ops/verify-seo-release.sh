#!/usr/bin/env bash
set -euo pipefail

readonly expected_sha="${1:-}"
readonly base_url="${2:-https://www.antoinequarroz.ch}"
readonly apex_url="${3:-https://antoinequarroz.ch}"

bash scripts/ops/verify-production-release.sh "$expected_sha" "$base_url"
bash scripts/ops/verify-domain-canonicalization.sh "$apex_url" "$base_url"
bash scripts/ops/verify-security-headers.sh "$base_url"
bash scripts/ops/verify-private-noindex.sh "$base_url"
bash scripts/ops/verify-openai-robots-policy.sh "$base_url"
bash scripts/ops/verify-localized-pages.sh "$base_url"
bash scripts/ops/verify-french-only-routes.sh "$base_url"
bash scripts/ops/verify-sitemap-discovery.sh "$base_url"
bash scripts/ops/verify-blog-ssr.sh "$base_url"
bash scripts/ops/verify-identity-social.sh "$base_url"
bash scripts/ops/verify-blog-posting.sh "$base_url"
bash scripts/ops/verify-service-breadcrumbs.sh "$base_url"
bash scripts/ops/verify-service-decision-content.sh "$base_url"
bash scripts/ops/verify-approved-case-studies.sh "$base_url"

echo "Complete SEO release proof passed for ${expected_sha}."
