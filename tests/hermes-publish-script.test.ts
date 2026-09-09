import { execFileSync } from 'node:child_process'
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

  it('generates a valid PNG cover without network access', () => {
    const output = execFileSync('python3', [
      '-c',
      'import importlib.util,sys; p=sys.argv[1]; s=importlib.util.spec_from_file_location("publisher",p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(m.branded_cover("test")[:38])',
      new URL('../scripts/hermes/publish_article.py', import.meta.url).pathname,
    ], { encoding: 'utf8' }).trim()
    expect(output).toBe('data:image/png;base64,iVBORw0KGgoAAAAN')
  })
})
