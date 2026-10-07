import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
// @ts-expect-error The deployment guard is deliberately executable plain JS.
import { auditRuntime, collectRuntimePackages } from '../scripts/check-runtime-security.mjs'

const directories: string[] = []
async function fixture(name = 'vue', version = '3.5.41') {
  const root = await mkdtemp(join(tmpdir(), 'runtime-security-'))
  directories.push(root)
  const pkg = join(root, name)
  await mkdir(pkg, { recursive: true })
  await writeFile(join(pkg, 'package.json'), JSON.stringify({ name, version }))
  return root
}
afterEach(async () => { await Promise.all(directories.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

describe('standalone runtime security gate', () => {
  it('audits the exact shipped versions including nested duplicates', async () => {
    const root = await fixture()
    const nested = join(root, 'other/node_modules/vue')
    await mkdir(nested, { recursive: true })
    await writeFile(join(nested, 'package.json'), JSON.stringify({ name: 'vue', version: '3.5.34' }))
    expect((await collectRuntimePackages(root)).vue.sort()).toEqual(['3.5.34', '3.5.41'])
  })
  it('rejects vulnerable build tooling even if it is classified as development in the root manifest', async () => {
    await expect(auditRuntime(await fixture('node-forge', '1.4.0'))).rejects.toThrow('Build-only packages found in runtime')
  })
  it('blocks high advisories and registry failures instead of treating them as a clean audit', async () => {
    const root = await fixture()
    await expect(auditRuntime(root, async () => new Response(JSON.stringify({ vue: [{ name: 'vue', severity: 'high', title: 'fixture advisory', url: 'https://example.invalid' }] })))).rejects.toThrow('fixture advisory')
    await expect(auditRuntime(root, async () => new Response('', { status: 503 }))).rejects.toThrow('HTTP 503')
  })
})
