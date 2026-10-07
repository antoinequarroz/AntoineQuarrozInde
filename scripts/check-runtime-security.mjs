import { readdir, readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Audit exact versions in Nitro's standalone output, not versions resolved
// from an invented install. This is the directory copied into production.
export async function collectRuntimePackages(root) {
  const packages = new Map()
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile() && entry.name === 'package.json') {
        const manifest = JSON.parse(await readFile(path, 'utf8'))
        if (manifest.name && manifest.version) {
          const versions = packages.get(manifest.name) || new Set()
          versions.add(manifest.version)
          packages.set(manifest.name, versions)
        }
      }
    }
  }
  await visit(root)
  if (!packages.size) throw new Error('No runtime packages found; build the standalone server first.')
  return Object.fromEntries([...packages].map(([name, versions]) => [name, [...versions]]))
}

export async function auditRuntime(root, request = fetch) {
  const packages = await collectRuntimePackages(root)
  // These development-only tools must never be shipped in the server image.
  const buildOnly = ['braces', 'node-forge', 'listhen', 'simple-git', '@nuxt/devtools']
  const shipped = buildOnly.filter(name => packages[name])
  if (shipped.length) throw new Error(`Build-only packages found in runtime: ${shipped.join(', ')}`)
  const response = await request('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(packages), signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Runtime security registry returned HTTP ${response.status}`)
  const advisories = await response.json()
  if (!advisories || typeof advisories !== 'object' || Array.isArray(advisories)) {
    throw new Error('Invalid runtime security registry response')
  }
  const findings = Object.values(advisories).flat()
  const blocked = findings.filter(item => ['high', 'critical'].includes(item.severity))
  if (blocked.length) throw new Error(blocked.map(item => `${item.name}: ${item.severity} — ${item.title} (${item.url})`).join('\n'))
  return { packages: Object.keys(packages).length, advisories: findings.length }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await auditRuntime(resolve('.output/server/node_modules'))
    console.log(`Runtime security: ${result.packages} packages checked; no high or critical advisory. ${result.advisories} lower-severity advisory(s).`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
