import { readFileSync } from 'node:fs'
import { createError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isHermesPublishRequestAuthorized } from '../server/utils/hermesPublishAuth'
import {
  HERMES_PUBLICATION_SITE,
  HERMES_EDITORIAL_COVER_STYLE,
  HERMES_VIOLET_EDITORIAL_COVER_STYLE,
  validateHermesArticlePayload,
  validateHermesCoverUpdatePayload,
  validateHermesIdempotencyKey,
} from '../server/utils/hermesArticlePayload'

const validBody = {
  site: HERMES_PUBLICATION_SITE,
  title: 'Créer un site vitrine utile en Valais',
  slug: 'creer-un-site-vitrine-utile-en-valais',
  excerpt: 'Les décisions concrètes à prendre avant de lancer un site professionnel en Valais.',
  content: 'Un contenu public vérifié. '.repeat(50),
  tags: ['SEO', 'Valais'],
  readTime: 6,
  published: true,
  coverImageDataUrl: `data:image/png;base64,${'A'.repeat(64)}`,
  sourceUrls: ['https://developers.google.com/search/docs', 'https://www.kmu.admin.ch/'],
  coverStyle: HERMES_EDITORIAL_COVER_STYLE,
}

const validCoverUpdate = {
  site: HERMES_PUBLICATION_SITE,
  articleId: 14,
  coverImageDataUrl: validBody.coverImageDataUrl,
  coverStyle: HERMES_EDITORIAL_COVER_STYLE,
}
const approvedCoverStyles = [HERMES_EDITORIAL_COVER_STYLE, HERMES_VIOLET_EDITORIAL_COVER_STYLE]

describe('Hermes article publication access', () => {
  beforeEach(() => vi.stubGlobal('createError', createError))
  afterEach(() => vi.unstubAllGlobals())

  it('requires an exact dedicated bearer token', () => {
    expect(isHermesPublishRequestAuthorized('Bearer publish-secret', 'publish-secret')).toBe(true)
    expect(isHermesPublishRequestAuthorized('Bearer read-secret', 'publish-secret')).toBe(false)
    expect(isHermesPublishRequestAuthorized('publish-secret', 'publish-secret')).toBe(false)
  })

  it.each(approvedCoverStyles)('preserves the approved article cover style %s', (coverStyle) => {
    const result = validateHermesArticlePayload({ ...validBody, coverStyle })
    expect(result.slug).toBe(validBody.slug)
    expect(result.sourceUrls).toHaveLength(2)
    expect(result.coverStyle).toBe(coverStyle)
    expect(validateHermesIdempotencyKey('seo:2026-09-10:article-001')).toContain('2026-09-10')
  })

  it('rejects another site, drafts, unknown fields and unsafe sources', () => {
    expect(() => validateHermesArticlePayload({ ...validBody, site: 'https://example.com' })).toThrow()
    expect(() => validateHermesArticlePayload({ ...validBody, published: false })).toThrow()
    expect(() => validateHermesArticlePayload({ ...validBody, delete: true })).toThrow()
    expect(() => validateHermesArticlePayload({ ...validBody, sourceUrls: ['http://example.com', 'https://example.org'] })).toThrow()
  })

  it.each(approvedCoverStyles)('preserves the approved image-only update style %s', (coverStyle) => {
    const update = validateHermesCoverUpdatePayload({ ...validCoverUpdate, coverStyle })
    expect(update.articleId).toBe(14)
    expect(update.coverStyle).toBe(coverStyle)
  })

  it.each(['pixel-art', 'aq-editorial-violet-space-grotesk-v2', `${HERMES_VIOLET_EDITORIAL_COVER_STYLE} `, '', null, undefined])('rejects an unapproved or missing exact cover style %s', (coverStyle) => {
    expect(() => validateHermesArticlePayload({ ...validBody, coverStyle })).toThrow('The approved editorial cover style must be explicit')
    expect(() => validateHermesCoverUpdatePayload({ ...validCoverUpdate, coverStyle })).toThrow('The approved editorial cover style must be explicit')
  })

  it.each(['title', 'content', 'published_at', 'expectedCoverImage', 'expectedVersion'])('keeps cover updates limited to the four allowed fields, rejecting %s', (field) => {
    expect(() => validateHermesCoverUpdatePayload({ ...validCoverUpdate, [field]: 'unexpected' })).toThrow('Unknown cover update fields are not accepted')
  })

  it('keeps the cover update endpoint image-only and audited', () => {
    const source = readFileSync(new URL('../server/api/hermes/articles.put.ts', import.meta.url), 'utf8')
    expect(source).toContain('requireHermesPublishAccess(event)')
    expect(source).toContain("action: 'hermes.article.cover_updated'")
    expect(source).toContain(".update({ cover_image:")
    expect(source).not.toMatch(/\.delete\s*\(/)
  })

  it('keeps the endpoint creation-only and bounded', () => {
    const source = readFileSync(new URL('../server/api/hermes/articles.post.ts', import.meta.url), 'utf8')
    expect(source).toContain('requireHermesPublishAccess(event)')
    expect(source).toContain('readJsonBodyLimited(event, MAX_HERMES_ARTICLE_REQUEST_BYTES)')
    expect(source).toContain(".upload(filePath, image.buffer, { contentType: image.mime, upsert: false })")
    expect(source).not.toMatch(/\.from\(['"]articles['"]\)[\s\S]{0,120}\.update\s*\(/)
    expect(source).not.toMatch(/\.delete\s*\(/)
    expect(source).not.toMatch(/\.upsert\s*\(/)
  })

  it('installs the private token only at deployment runtime', () => {
    const compose = readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8')
    const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
    const release = readFileSync(new URL('../scripts/ops/deploy-release.sh', import.meta.url), 'utf8')

    expect(compose).toContain('NUXT_HERMES_PUBLISH_TOKEN: ${HERMES_PUBLISH_TOKEN:-}')
    expect(workflow).toContain('HERMES_PUBLISH_TOKEN: ${{ secrets.HERMES_PUBLISH_TOKEN }}')
    expect(workflow).toContain(`printf '%s\\n%s\\n' "$HERMES_READ_TOKEN" "$HERMES_PUBLISH_TOKEN" | ssh`)
    expect(release).toContain('bash scripts/ops/install-hermes-publish-token.sh "$PWD/.env" "$publish_token_file"')
  })
})
