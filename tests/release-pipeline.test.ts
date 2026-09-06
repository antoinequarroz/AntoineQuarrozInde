import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const workflowPath = '.github/workflows/ci.yml'
const verifyScript = 'scripts/ops/verify-production-release.sh'
const deployScript = 'scripts/ops/deploy-from-ci.sh'
const sshGateScript = 'scripts/ops/ci-ssh-gate.sh'
const releaseScript = 'scripts/ops/deploy-release.sh'
const legacyShipScript = 'scripts/ship.ps1'
const servers: ReturnType<typeof createServer>[] = []
const unixIt = process.platform === 'win32' ? it.skip : it

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })))
})

async function serveRelease(version: string, healthy = true) {
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json')
    if (request.url === '/api/version') {
      response.end(JSON.stringify({ version }))
      return
    }
    if (request.url === '/api/health') {
      response.statusCode = healthy ? 200 : 503
      response.end(JSON.stringify({
        status: healthy ? 'ok' : 'degraded',
        checks: { application: 'ok', database: healthy ? 'ok' : 'error' },
      }))
      return
    }
    response.statusCode = 404
    response.end('{}')
  })
  servers.push(server)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not expose a TCP port')
  return `http://127.0.0.1:${address.port}`
}

describe('AQ-058 release pipeline', () => {
  it('orders quality, production deployment and E2E without deploying pull requests', async () => {
    const workflow = await readFile(workflowPath, 'utf8')

    expect(workflow).toContain("if: github.event_name == 'push' && github.ref == 'refs/heads/main'")
    expect(workflow).toContain('needs: [quality, database, seo-quality]')
    expect(workflow).toContain('needs: [quality, deploy]')
    expect(workflow).toContain("github.event_name != 'push' || needs.deploy.result == 'success'")
    expect(workflow.indexOf('\n  deploy:')).toBeLessThan(workflow.indexOf('\n  e2e:'))
  })

  it('runs public browser flows against the candidate before production', async () => {
    const workflow = await readFile(workflowPath, 'utf8')
    const candidateE2e = 'E2E_BASE_URL=http://127.0.0.1:3100 npm run test:e2e -- e2e/public.spec.ts --project=chromium'

    expect(workflow).toContain(candidateE2e)
    expect(workflow.indexOf(candidateE2e)).toBeLessThan(workflow.indexOf('\n  deploy:'))
  })

  it('passes an optional TOTP secret only to post-production E2E', async () => {
    const workflow = await readFile(workflowPath, 'utf8')

    expect(workflow).toContain('E2E_ADMIN_TOTP_SECRET: ${{ secrets.E2E_ADMIN_TOTP_SECRET }}')
    expect(workflow).not.toContain('test -n "$E2E_ADMIN_TOTP_SECRET"')
  })

  it('keeps the blog SSR proof inside the automatic rollback transaction', async () => {
    const release = await readFile(releaseScript, 'utf8')
    const proof = 'bash scripts/ops/verify-seo-release.sh "$APP_VERSION"'
    const proofIndex = release.indexOf(proof)

    expect(release).toContain(proof)
    expect(release.indexOf('trap rollback ERR')).toBeLessThan(proofIndex)
    expect(release.indexOf('trap - ERR', proofIndex)).toBeGreaterThan(proofIndex)
  })

  it('runs Node-based VPS proofs through the candidate image when the host has no runtime', async () => {
    const [release, nodeShim] = await Promise.all([
      readFile(releaseScript, 'utf8'),
      readFile('scripts/ops/node-proof-bin/node', 'utf8'),
    ])

    expect(release).toContain('if ! command -v node >/dev/null 2>&1')
    expect(release).toContain('export PATH="$PWD/scripts/ops/node-proof-bin:$PATH"')
    expect(nodeShim).toContain('antoinequarroz-web:candidate')
    expect(nodeShim).toContain('docker run --rm -i')
    expect(release.indexOf('git archive --format=tar HEAD')).toBeLessThan(release.indexOf('export PATH='))
    expect(release.indexOf('export PATH=')).toBeLessThan(release.indexOf('bash scripts/ops/verify-seo-release.sh'))
  })

  it('atomically refreshes the forced CI deploy command after a verified release', async () => {
    const release = await readFile(releaseScript, 'utf8')
    const proofIndex = release.indexOf('bash scripts/ops/verify-seo-release.sh')
    const installIndex = release.indexOf('install_next_ci_deploy_command', proofIndex)

    expect(release).toContain('temporary="$(mktemp "$target_dir/.antoinequarroz-ci-deploy.XXXXXX")"')
    expect(release).toContain('install -m 700 "$source" "$temporary"')
    expect(release).toContain('mv -f "$temporary" "$target"')
    expect(installIndex).toBeGreaterThan(proofIndex)
    expect(release.indexOf('trap - ERR', proofIndex)).toBeGreaterThan(installIndex)
  })

  it('keeps the legacy shipping shortcut disarmed', async () => {
    const ship = await readFile(legacyShipScript, 'utf8')

    expect(ship).toContain('PR -> merge -> approbation Production')
    expect(ship).not.toMatch(/git\s+(?:add|commit|push)/)
    expect(ship).not.toContain('deploy-vps.ps1')
  })

  it('builds only the exact clean commit and keeps runtime secrets out of the image', async () => {
    const [deploy, release, dockerignore, dockerfile, compose] = await Promise.all([
      readFile(deployScript, 'utf8'),
      readFile(releaseScript, 'utf8'),
      readFile('.dockerignore', 'utf8'),
      readFile('Dockerfile', 'utf8'),
      readFile('docker-compose.yml', 'utf8'),
    ])

    expect(deploy).toContain('git status --porcelain=v1 --untracked-files=all')
    expect(deploy.match(/assert_clean_checkout/g)?.length).toBeGreaterThanOrEqual(3)
    expect(release).toContain('git archive --format=tar HEAD')
    expect(release).toContain('--no-cache')
    expect(release).not.toContain('docker compose build web')
    expect(dockerignore).toMatch(/^\.env$/m)
    expect(dockerignore).toMatch(/^\.env\.\*$/m)
    expect(dockerfile).toContain('USER node')
    expect(dockerfile).toMatch(/FROM node:22\.19-alpine@sha256:[0-9a-f]{64}/)
    expect(compose).toMatch(/image: caddy:2\.10\.2-alpine@sha256:[0-9a-f]{64}/)
    expect(compose).toContain('NUXT_SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-}')
    expect(compose).toContain('NUXT_TURNSTILE_SECRET_KEY: ${TURNSTILE_SECRET_KEY:-}')
    expect(compose).toContain('NUXT_GOOGLE_PLACES_API_KEY: ${GOOGLE_PLACES_API_KEY:-}')
  })

  it('pins third-party Actions and limits credentials to the steps that consume them', async () => {
    const workflow = await readFile(workflowPath, 'utf8')

    expect(workflow).not.toMatch(/uses: actions\/(?:checkout|setup-node|upload-artifact)@v\d+/)
    expect(workflow).toContain('npm audit --omit=dev --audit-level=high')
    expect(workflow).not.toContain('    env:\n      EXPECTED_SHA: ${{ github.sha }}\n      VPS_HOST:')
    expect(workflow).not.toContain('      E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}\n      E2E_ADMIN_PASSWORD:')
  })

  it('backs up storage bucket metadata before promoting migrations', async () => {
    const migrationPromotion = await readFile('scripts/ops/promote-supabase-migrations.sh', 'utf8')

    expect(migrationPromotion).toContain('--schema storage')
    expect(migrationPromotion).toContain('--exclude storage.objects')
    expect(migrationPromotion).toContain('storage-metadata.sql')
    expect(migrationPromotion.indexOf('storage metadata backup')).toBeLessThan(migrationPromotion.indexOf('migration push'))
  })

  it('initializes monitoring findings before optional checks append to them', async () => {
    const monitor = await readFile('scripts/ops/monitor.sh', 'utf8')

    expect(monitor.indexOf('issues=()')).toBeLessThan(monitor.indexOf('if [[ "$REQUIRE_RESTORE_DRILL" == "true" ]]'))
  })

  it('requires a dedicated key and strict host verification', async () => {
    const workflow = await readFile(workflowPath, 'utf8')
    const gate = await readFile(sshGateScript, 'utf8')

    expect(workflow).toContain('VPS_SSH_PRIVATE_KEY: ${{ secrets.VPS_SSH_PRIVATE_KEY }}')
    expect(workflow).toContain('VPS_KNOWN_HOSTS: ${{ secrets.VPS_KNOWN_HOSTS }}')
    expect(workflow).toContain('-o StrictHostKeyChecking=yes')
    expect(workflow).toContain('-o UserKnownHostsFile="$HOME/.ssh/known_hosts"')
    expect(workflow).not.toContain('StrictHostKeyChecking=no')
    expect(workflow).not.toContain('ssh-keyscan')
    expect(workflow).not.toContain('< scripts/ops/deploy-from-ci.sh')
    expect(workflow).not.toMatch(/-----BEGIN OPENSSH PRIVATE KEY-----/)
    expect(gate).toContain('exec "$deploy_command"')
    expect(gate).not.toContain('exec bash -s')
  })

  it('promotes Supabase only inside the approved Production job before SSH deployment', async () => {
    const workflow = await readFile(workflowPath, 'utf8')
    const promoteScript = await readFile('scripts/ops/promote-supabase-migrations.sh', 'utf8')

    expect(workflow).toContain('environment:\n      name: Production')
    expect(workflow).toContain('SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}')
    expect(workflow).toContain('SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}')
    expect(workflow).toContain('SUPABASE_BACKUP_AGE_RECIPIENT: ${{ secrets.SUPABASE_BACKUP_AGE_RECIPIENT }}')
    expect(workflow).not.toContain('SUPABASE_DB_PASSWORD')
    expect(workflow.indexOf('Promote verified Supabase migrations')).toBeLessThan(workflow.indexOf('Deploy the exact main commit'))
    expect(workflow).toContain('if: always()')
    expect(workflow).toContain('if-no-files-found: ignore')
    expect(workflow).not.toMatch(/pull_request_target/)

    expect(promoteScript).toContain('db push --linked --dry-run')
    expect(promoteScript).toContain('db dump --linked')
    expect(promoteScript).toContain('age --recipient')
    expect(promoteScript).toContain('db push --linked --yes')
    expect(promoteScript).not.toMatch(/db reset|migration repair|--include-all|--debug/)
    expect(promoteScript).not.toContain('--password')
  })

  unixIt('accepts only the expected healthy production release', async () => {
    const expectedSha = 'a'.repeat(40)
    const baseUrl = await serveRelease(expectedSha)

    const result = await execFileAsync('bash', [verifyScript, expectedSha, baseUrl, '1', '0'], { cwd: process.cwd() })
    expect(result.stdout).toContain(`Production serves ${expectedSha} and is healthy.`)
  })

  unixIt('fails when production exposes another commit', async () => {
    const expectedSha = 'a'.repeat(40)
    const baseUrl = await serveRelease('b'.repeat(40))

    await expect(execFileAsync('bash', [verifyScript, expectedSha, baseUrl, '1', '0'], { cwd: process.cwd() }))
      .rejects.toMatchObject({ code: 1 })
  })

  unixIt('rejects an untrusted deployment revision before touching the repository', async () => {
    await expect(execFileAsync('bash', [deployScript, 'main', process.cwd()], { cwd: process.cwd() }))
      .rejects.toMatchObject({ code: 64 })
  })

  unixIt('rejects arbitrary commands presented to the dedicated SSH key', async () => {
    await expect(execFileAsync('bash', [sshGateScript], {
      cwd: process.cwd(),
      env: { ...process.env, SSH_ORIGINAL_COMMAND: 'bash -i' },
    })).rejects.toMatchObject({ code: 64 })
  })

})
