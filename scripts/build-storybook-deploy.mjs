import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
const source = resolve('storybook-static')
const destination = resolve('deploy/storybook')
await mkdir(destination, { recursive: true })
// Preserve only hosting config and its project link. Copy only the static build.
for (const entry of await readdir(destination)) {
  if (!['.vercel', 'vercel.json', '.gitignore'].includes(entry)) await rm(resolve(destination, entry), { recursive: true, force: true })
}
for (const entry of await readdir(source)) await cp(resolve(source, entry), resolve(destination, entry), { recursive: true })
console.log('Static Storybook staged in deploy/storybook; no application environment or server files copied.')
