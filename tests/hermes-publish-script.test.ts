import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Hermes publication helper', () => {
  it('keeps publication restricted to the canonical site and token env', () => {
    const source = readFileSync(new URL('../scripts/hermes/publish_article.py', import.meta.url), 'utf8')
    expect(source).toContain('SITE = "https://www.antoinequarroz.ch"')
    expect(source).toContain('os.environ.get("HERMES_PUBLISH_TOKEN"')
    expect(source).toContain('"Idempotency-Key": idempotency_key')
    expect(source).toContain('payload["published"] = True')
  })

  it('fails closed instead of generating an off-brand fallback cover', () => {
    const root = mkdtempSync(join(tmpdir(), 'aq-hermes-cover-'))
    const payload = join(root, 'article.json')
    writeFileSync(payload, JSON.stringify({ title: 'Article sans couverture', slug: 'article-sans-couverture' }))
    expect(() => execFileSync('python3', [
      '-c',
      'import importlib.util,sys; p=sys.argv[1]; s=importlib.util.spec_from_file_location("publisher",p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); m.load_payload(__import__("pathlib").Path(sys.argv[2]))',
      new URL('../scripts/hermes/publish_article.py', import.meta.url).pathname,
      payload,
    ], { encoding: 'utf8', stdio: 'pipe' })).toThrow()
  })
})
