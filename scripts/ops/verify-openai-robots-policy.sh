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

node - "$robots_file" "$expected_sitemap" <<'NODE'
const { readFileSync } = require('node:fs')

const [robotsFile, expectedSitemap] = process.argv.slice(2)
const body = readFileSync(robotsFile, 'utf8')
const groups = []
const sitemaps = []
let agents = []
let allow = []
let disallow = []

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function flushGroup() {
  if (agents.length > 0) groups.push({ agents, allow, disallow })
  agents = []
  allow = []
  disallow = []
}

for (const rawLine of body.split(/\r?\n/)) {
  const line = rawLine.replace(/#.*$/, '').trim()
  if (!line) {
    flushGroup()
    continue
  }

  const separator = line.indexOf(':')
  if (separator < 0) continue
  const field = line.slice(0, separator).trim().toLowerCase()
  const value = line.slice(separator + 1).trim()

  if (field === 'user-agent') {
    if (allow.length > 0 || disallow.length > 0) flushGroup()
    agents.push(value.toLowerCase())
  }
  else if (field === 'allow') {
    if (agents.length === 0) fail('Allow directive has no user-agent group.')
    allow.push(value)
  }
  else if (field === 'disallow') {
    if (agents.length === 0) fail('Disallow directive has no user-agent group.')
    disallow.push(value)
  }
  else if (field === 'sitemap') {
    flushGroup()
    sitemaps.push(value)
  }
}
flushGroup()

function requireExactGroup(agent, expectedAllow, expectedDisallow) {
  const normalized = agent.toLowerCase()
  const matches = groups.filter(group => group.agents.includes(normalized))

  if (matches.length !== 1 || matches[0].agents.length !== 1) {
    fail(`Expected exactly one distinct ${agent} group.`)
  }

  const group = matches[0]
  if (JSON.stringify(group.allow) !== JSON.stringify(expectedAllow)
    || JSON.stringify(group.disallow) !== JSON.stringify(expectedDisallow)) {
    fail(`Unexpected Allow/Disallow policy for ${agent}.`)
  }
}

requireExactGroup('OAI-SearchBot', ['/'], [])
requireExactGroup('GPTBot', [], ['/'])
requireExactGroup('*', ['/'], [])

if (sitemaps.length !== 1 || sitemaps[0] !== expectedSitemap) {
  fail(`Expected exactly one canonical sitemap: ${expectedSitemap}`)
}
NODE

curl --fail --silent --show-error --max-time 12 --output /dev/null \
  "$expected_sitemap"

echo "OpenAI robots policy and canonical sitemap are valid on ${origin}."
