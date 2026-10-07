import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

// The Docker dependency layer contains package manifests, but no application
// configuration. Preparing Nuxt there would enable its default DevTools.
// Nuxt build prepares the complete application after its source is copied.
if (existsSync('nuxt.config.ts')) {
  const result = spawnSync('nuxt', ['prepare'], {
    stdio: 'inherit', shell: process.platform === 'win32',
  })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} else {
  console.log('Nuxt preparation deferred until application source is available.')
}
