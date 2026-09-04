#!/usr/bin/env bash
set -euo pipefail

readonly base_url="${1:-https://www.antoinequarroz.ch}"

if [[ ! "$base_url" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]+)?/?$ ]]; then
  echo "Expected an HTTP(S) origin URL without a path, query or credentials." >&2
  exit 64
fi

node - "${base_url%/}" <<'NODE'
const origin = process.argv[2]

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function decode(value = '') {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function attributes(tag) {
  const result = {}
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)) {
    result[match[1].toLowerCase()] = decode(match[3])
  }
  for (const match of tag.matchAll(/\s(data-[\w-]+)(?=\s|>|\/)/gi)) {
    result[match[1].toLowerCase()] ??= ''
  }
  return result
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))]
    .map(match => attributes(match[0]))
}

function visibleDocument(html) {
  return decode(html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchChecked(url, expectedType) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(url, { redirect: 'manual', signal: controller.signal })
    if (!response.ok) fail(`${url}: unexpected HTTP ${response.status}.`)
    const contentType = response.headers.get('content-type')?.toLowerCase() || ''
    if (expectedType === 'json' && !contentType.includes('application/json')) {
      fail(`${url}: expected JSON.`)
    }
    if (expectedType === 'html' && !contentType.includes('text/html')) {
      fail(`${url}: expected HTML.`)
    }
    const maxBytes = expectedType === 'json' ? 2_000_000 : 4_000_000
    const declaredLength = Number(response.headers.get('content-length') || 0)
    if (declaredLength > maxBytes) fail(`${url}: response is larger than the proof limit.`)
    if (!response.body) return ''
    const reader = response.body.getReader()
    const chunks = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        fail(`${url}: response is larger than the proof limit.`)
      }
      chunks.push(value)
    }
    return Buffer.concat(chunks).toString('utf8')
  }
  catch (error) {
    fail(`${url}: ${error instanceof Error ? error.message : 'request failed'}.`)
  }
  finally {
    clearTimeout(timeout)
  }
}

function one(values, label, pageUrl) {
  if (values.length !== 1) fail(`${pageUrl}: expected exactly one ${label}.`)
  return values[0]
}

function parseBlogPosting(html, pageUrl) {
  const values = []
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = attributes(`<script ${match[1]}>`)
    if (attrs.type !== 'application/ld+json') continue
    try {
      const parsed = JSON.parse(decode(match[2].trim()))
      const nodes = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed]
      values.push(...nodes.filter(node => node?.['@type'] === 'BlogPosting'))
    }
    catch {
      fail(`${pageUrl}: invalid JSON-LD.`)
    }
  }
  return one(values, 'BlogPosting object', pageUrl)
}

function oneMeta(html, property, pageUrl) {
  const matches = tags(html, 'meta').filter(meta => meta.property === property || meta.name === property)
  const value = one(matches, `${property} meta tag`, pageUrl).content?.trim()
  if (!value) fail(`${pageUrl}: ${property} is empty.`)
  return value
}

function oneCanonical(html, pageUrl) {
  const links = tags(html, 'link').filter(link => link.rel === 'canonical')
  const href = one(links, 'canonical link', pageUrl).href
  if (!href) fail(`${pageUrl}: canonical is empty.`)
  return href
}

function validTimestamp(value, label, pageUrl) {
  if (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value))) {
    fail(`${pageUrl}: ${label} must be a valid source timestamp.`)
  }
  return value.trim()
}

function assertArticle(article, html) {
  const pageUrl = `${origin}/blog/${encodeURIComponent(article.slug)}`
  if (article.author_key !== 'antoine-quarroz') fail(`${pageUrl}: article author is missing or unapproved.`)
  const publishedAt = validTimestamp(article.published_at, 'published_at', pageUrl)
  const updatedAt = validTimestamp(article.updated_at, 'updated_at', pageUrl)
  const expectedModified = Date.parse(updatedAt) > Date.parse(publishedAt) ? updatedAt : null
  const canonical = oneCanonical(html, pageUrl)
  let canonicalUrl
  try {
    canonicalUrl = new URL(canonical)
  }
  catch {
    fail(`${pageUrl}: canonical URL is invalid.`)
  }
  const encodedSlug = canonicalUrl.pathname.slice('/blog/'.length)
  if (canonicalUrl.origin !== origin
    || !canonicalUrl.pathname.startsWith('/blog/')
    || decodeURIComponent(encodedSlug) !== article.slug
    || canonicalUrl.search
    || canonicalUrl.hash) {
    fail(`${pageUrl}: canonical URL diverges.`)
  }

  const visible = visibleDocument(html)
  for (const text of [article.title, article.excerpt, 'Antoine Quarroz']) {
    if (!visible.includes(text)) fail(`${pageUrl}: visible article data is missing: ${text}.`)
  }

  const author = one(tags(html, 'a').filter(tag => 'data-article-author' in tag), 'visible author link', pageUrl)
  if (new URL(author.href, origin).href !== `${origin}/#about`) {
    fail(`${pageUrl}: visible author link does not target the homepage profile.`)
  }

  const published = one(tags(html, 'time').filter(tag => 'data-article-published' in tag), 'publication time', pageUrl)
  if (published.datetime !== publishedAt) fail(`${pageUrl}: visible publication date diverges.`)
  const modified = tags(html, 'time').filter(tag => 'data-article-modified' in tag)
  if (expectedModified) {
    if (one(modified, 'modification time', pageUrl).datetime !== expectedModified) {
      fail(`${pageUrl}: visible modification date diverges.`)
    }
  }
  else if (modified.length) {
    fail(`${pageUrl}: a modification date was invented.`)
  }

  const posting = parseBlogPosting(html, pageUrl)
  const expected = {
    headline: article.title,
    description: article.excerpt,
    image: oneMeta(html, 'og:image', pageUrl),
    inLanguage: 'fr-CH',
    url: canonical,
    datePublished: publishedAt,
  }
  for (const [key, value] of Object.entries(expected)) {
    if (posting[key] !== value) fail(`${pageUrl}: BlogPosting.${key} diverges.`)
  }
  if (posting.mainEntityOfPage?.['@id'] !== canonical) {
    fail(`${pageUrl}: BlogPosting.mainEntityOfPage diverges.`)
  }
  if (posting.author?.['@type'] !== 'Person'
    || posting.author?.['@id'] !== `${origin}/#person`
    || posting.author?.name !== 'Antoine Quarroz'
    || posting.author?.url !== `${origin}/`) {
    fail(`${pageUrl}: BlogPosting author does not match the homepage entity.`)
  }
  if (expectedModified) {
    if (posting.dateModified !== expectedModified) fail(`${pageUrl}: BlogPosting.dateModified diverges.`)
  }
  else if ('dateModified' in posting) {
    fail(`${pageUrl}: BlogPosting invents dateModified.`)
  }
}

async function main() {
  let articles
  try {
    articles = JSON.parse(await fetchChecked(`${origin}/api/articles`, 'json'))
  }
  catch {
    fail('The public article API returned invalid JSON.')
  }
  if (!Array.isArray(articles)) fail('The public article API must return an array.')

  for (const article of articles) {
    if (!article || article.published !== true || typeof article.slug !== 'string' || !article.slug) {
      fail('The public article API exposed an invalid or private record.')
    }
    const pageUrl = `${origin}/blog/${encodeURIComponent(article.slug)}`
    assertArticle(article, await fetchChecked(pageUrl, 'html'))
  }

  process.stdout.write(`BlogPosting attribution is valid on ${articles.length} published article(s) at ${origin}.\n`)
}

main().catch(error => fail(error instanceof Error ? error.message : 'Unexpected verification failure.'))
NODE
