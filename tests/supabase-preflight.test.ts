import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('AQ-059 Supabase preflight', () => {
  it('pins the local CLI and exposes the database test command', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
    const config = await readFile('supabase/config.toml', 'utf8')

    expect(packageJson.devDependencies.supabase).toBe('2.113.0')
    expect(packageJson.scripts['test:db']).toBe('bash scripts/ops/test-supabase-migrations.sh')
    expect(config).toContain('project_id = "antoinequarroz-preflight"')
    expect(config).not.toMatch(/access_token|service_role|password|project_ref/i)
  })

  it('uses only an ephemeral local project and always cleans it up', async () => {
    const script = await readFile('scripts/ops/test-supabase-migrations.sh', 'utf8')

    expect(script).toContain('mktemp -d')
    expect(script).toContain('trap cleanup EXIT INT TERM')
    expect(script).toContain('unset SUPABASE_ACCESS_TOKEN')
    expect(script).toContain('readonly project_id="aq059-$$-${RANDOM}"')
    expect(script).not.toMatch(/export (?:HOME|USERPROFILE)=/)
    expect(script).toContain('20260701000000_initial_schema.sql')
    expect(script).toContain('20260701000001_platform_compatibility.sql')
    expect(script).toContain('db reset --local --no-seed')
    expect(script).toContain('test db --local')
    expect(script).not.toMatch(/--linked|db push|migration repair|--db-url/)

    const fixture = await readFile('supabase/tests/fixtures/platform_compatibility.sql', 'utf8')
    expect(fixture).toContain('returns event_trigger')
    expect(fixture).toContain('revoke all on function public.rls_auto_enable()')
  })

  it('blocks deployment until quality and database checks succeed', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8')

    expect(workflow).toContain('\n  database:')
    expect(workflow.indexOf('\n  database:')).toBeLessThan(workflow.indexOf('\n  deploy:'))
    expect(workflow).toContain('needs: [quality, database, seo-quality]')
    expect(workflow).toContain('run: npm run test:db')
    expect(workflow).not.toMatch(/supabase (?:db push|link|migration repair)/)
  })

  it('covers RLS, public grants, invoker rights and organization constraints in pgTAP', async () => {
    const sql = await readFile('supabase/tests/database/aq059_security.test.sql', 'utf8')

    expect(sql).toContain('relrowsecurity')
    expect(sql).toContain("has_table_privilege('anon'")
    expect(sql).toContain("has_table_privilege('authenticated'")
    expect(sql).toContain('not p.prosecdef')
    expect(sql).toContain("has_function_privilege(\n    'service_role'")
    expect(sql).toContain("conname = 'invoice_payments_org_invoice_fk'")
    expect(sql).toContain("conname = 'invoices_recurring_profile_org_fk'")
  })
})
