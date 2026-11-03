import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
async function walk(dir) { return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(e => e.isDirectory() ? walk(path.join(dir, e.name)) : path.join(dir, e.name)))).flat() }
const components = (await walk('app/components')).filter(f => f.endsWith('.vue'))
const stories = (await walk('stories')).filter(f => f.endsWith('.stories.ts'))
const sources = await Promise.all(stories.map(f => readFile(f, 'utf8')))
const missing = components.filter(c => !sources.some(source => source.includes(c)))
if (missing.length) { console.error('Composants sans story :\n' + missing.join('\n')); process.exit(1) }
console.log(`Couverture : ${components.length}/${components.length} composants importés dans ${stories.length} fichiers de stories.`)
