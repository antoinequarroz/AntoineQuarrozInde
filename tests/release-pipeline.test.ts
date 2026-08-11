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
    expect(workflow).toContain('needs: [quality, database]')
    expect(workflow).toContain('needs: [quality, deploy]')
    expect(workflow).toContain("github.event_name != 'push' || needs.deploy.result == 'success'")
    expect(workflow.indexOf('\n  deploy:')).toBeLessThan(workflow.indexOf('\n  e2e:'))
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
