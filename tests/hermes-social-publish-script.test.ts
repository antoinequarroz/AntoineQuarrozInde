import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const script = new URL('../scripts/hermes/publish_social.py', import.meta.url).pathname

function createDraft(status: string, platform = 'linkedin', text?: string) {
  const project = mkdtempSync(join(tmpdir(), 'hermes-social-'))
  const draftDir = join(project, 'seo/social/a-valider')
  mkdirSync(draftDir, { recursive: true })
  const articleUrl = 'https://www.antoinequarroz.ch/blog/test-social'
  const body = text ?? `Une idée concrète pour votre prochain site.\n\n${articleUrl}`
  const path = join(draftDir, `${platform}.md`)
  writeFileSync(path, `---\nplatform: ${platform}\nstatut: ${status}\narticle_url: ${articleUrl}\n---\n${body}\n`)
  return { project, path }
}

describe('Hermes social publication helper', () => {
  it('requires an explicit approval before any external write', () => {
    const { project, path } = createDraft('A_VALIDER')
    expect(() => execFileSync('python3', [script, '--project', project, '--draft', path, '--dry-run']))
      .toThrow(/statut doit etre exactement APPROUVE/)
  })

  it('validates an approved LinkedIn draft without publishing in dry-run mode', () => {
    const { project, path } = createDraft('APPROUVE')
    const receipt = JSON.parse(execFileSync('python3', [
      script, '--project', project, '--draft', path, '--dry-run',
    ], { encoding: 'utf8' }))
    expect(receipt).toMatchObject({ platform: 'linkedin', externalWrite: false, status: 'validated' })
  })

  it('rejects an X draft longer than 280 characters', () => {
    const articleUrl = 'https://www.antoinequarroz.ch/blog/test-social'
    const { project, path } = createDraft('APPROUVE', 'x', `${'a'.repeat(260)} ${articleUrl}`)
    expect(() => execFileSync('python3', [script, '--project', project, '--draft', path, '--dry-run']))
      .toThrow(/depasse 280 caracteres/)
  })

  it('keeps tokens out of source and documents the X cost gate', () => {
    const source = readFileSync(script, 'utf8')
    expect(source).toContain('os.environ.get("LINKEDIN_ACCESS_TOKEN"')
    expect(source).toContain('os.environ.get("X_API_KEY"')
    expect(source).toContain('os.environ.get("X_API_SECRET"')
    expect(source).toContain('os.environ.get("X_ACCESS_TOKEN"')
    expect(source).toContain('os.environ.get("X_ACCESS_TOKEN_SECRET"')
    expect(source).toContain('oauth_signature_method')
    expect(source).toContain('HMAC-SHA1')
    expect(source).toContain('HERMES_X_MAX_USD_PER_POST')
    expect(source).toContain('X_POST_WITH_URL_ESTIMATED_USD = 0.20')
  })
})
