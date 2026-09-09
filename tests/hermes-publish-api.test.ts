import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isHermesPublishRequestAuthorized } from '../server/utils/hermesPublishAuth'
import {
  HERMES_PUBLICATION_SITE,
  validateHermesArticlePayload,
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
}

describe('Hermes article publication access', () => {
  it('requires an exact dedicated bearer token', () => {
    expect(isHermesPublishRequestAuthorized('Bearer publish-secret', 'publish-secret')).toBe(true)
    expect(isHermesPublishRequestAuthorized('Bearer read-secret', 'publish-secret')).toBe(false)
    expect(isHermesPublishRequestAuthorized('publish-secret', 'publish-secret')).toBe(false)
  })

  it('accepts a strict article payload for the approved site', () => {
    const result = validateHermesArticlePayload(validBody)
    expect(result.slug).toBe(validBody.slug)
    expect(result.sourceUrls).toHaveLength(2)
    expect(validateHermesIdempotencyKey('seo:2026-09-10:article-001')).toContain('2026-09-10')
  })

  it('rejects another site, drafts, unknown fields and unsafe sources', () => {
    expect(() => validateHermesArticlePayload({ ...validBody, site: 'https://example.com' })).toThrow()
    expect(() => validateHermesArticlePayload({ ...validBody, published: false })).toThrow()
    expect(() => validateHermesArticlePayload({ ...validBody, delete: true })).toThrow()
    expect(() => validateHermesArticlePayload({ ...validBody, sourceUrls: ['http://example.com', 'https://example.org'] })).toThrow()
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
