#!/usr/bin/env bash
set -euo pipefail

readonly base_url="${1:-https://www.antoinequarroz.ch}"

validate_base_url() {
  local value="$1"
  [[ "$value" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]+)?/?$ ]]
}

if ! validate_base_url "$base_url"; then
  echo "Expected an HTTP(S) origin URL without a path, query or credentials." >&2
  exit 64
fi

readonly origin="${base_url%/}"
readonly expected_sitemap="${origin}/sitemap.xml"
robots_file="$(mktemp)"
readonly robots_file

cleanup() {
  rm -f -- "$robots_file"
}
trap cleanup EXIT

curl --fail --silent --show-error --max-time 12 \
  "${origin}/robots.txt" > "$robots_file"

# Keep the production proof portable: the VPS only needs POSIX awk and curl;
# the application runtime itself remains isolated inside Docker.
awk -v expected_sitemap="$expected_sitemap" '
function trim(value) {
  sub(/^[[:space:]]+/, "", value)
  sub(/[[:space:]]+$/, "", value)
  return value
}

function fail(message) {
  print message > "/dev/stderr"
  failed = 1
  exit 1
}

function flush_group(    group, item) {
  if (agent_count == 0) return

  group = ++group_count
  group_agent_count[group] = agent_count
  group_allow_count[group] = allow_count
  group_disallow_count[group] = disallow_count

  for (item = 1; item <= agent_count; item += 1) {
    group_agent[group, item] = agents[item]
    delete agents[item]
  }
  for (item = 1; item <= allow_count; item += 1) {
    group_allow[group, item] = allows[item]
    delete allows[item]
  }
  for (item = 1; item <= disallow_count; item += 1) {
    group_disallow[group, item] = disallows[item]
    delete disallows[item]
  }
  agent_count = allow_count = disallow_count = 0
}

function require_exact_group(agent, expected_allow_count, expected_allow, expected_disallow_count, expected_disallow,    group, item, matches, matching_group, unexpected_policy) {
  for (group = 1; group <= group_count; group += 1) {
    for (item = 1; item <= group_agent_count[group]; item += 1) {
      if (group_agent[group, item] == tolower(agent)) {
        matches += 1
        matching_group = group
      }
    }
  }

  if (matches != 1 || group_agent_count[matching_group] != 1)
    fail("Expected exactly one distinct " agent " group.")

  unexpected_policy = group_allow_count[matching_group] != expected_allow_count
  unexpected_policy = unexpected_policy || (expected_allow_count == 1 && group_allow[matching_group, 1] != expected_allow)
  unexpected_policy = unexpected_policy || group_disallow_count[matching_group] != expected_disallow_count
  unexpected_policy = unexpected_policy || (expected_disallow_count == 1 && group_disallow[matching_group, 1] != expected_disallow)
  if (unexpected_policy)
    fail("Unexpected Allow/Disallow policy for " agent ".")
}

{
  line = $0
  sub(/#.*/, "", line)
  line = trim(line)

  if (line == "") {
    flush_group()
    next
  }

  separator = index(line, ":")
  if (separator == 0) next

  field = tolower(trim(substr(line, 1, separator - 1)))
  value = trim(substr(line, separator + 1))

  if (field == "user-agent") {
    if (allow_count > 0 || disallow_count > 0) flush_group()
    agents[++agent_count] = tolower(value)
  }
  else if (field == "allow") {
    if (agent_count == 0) fail("Allow directive has no user-agent group.")
    allows[++allow_count] = value
  }
  else if (field == "disallow") {
    if (agent_count == 0) fail("Disallow directive has no user-agent group.")
    disallows[++disallow_count] = value
  }
  else if (field == "sitemap") {
    flush_group()
    sitemaps[++sitemap_count] = value
  }
}

END {
  if (failed) exit 1
  flush_group()

  require_exact_group("OAI-SearchBot", 1, "/", 0, "")
  require_exact_group("GPTBot", 0, "", 1, "/")
  require_exact_group("*", 1, "/", 0, "")

  if (sitemap_count != 1 || sitemaps[1] != expected_sitemap)
    fail("Expected exactly one canonical sitemap: " expected_sitemap)
}
' "$robots_file"

curl --fail --silent --show-error --max-time 12 --output /dev/null \
  "$expected_sitemap"

echo "OpenAI robots policy and canonical sitemap are valid on ${origin}."
