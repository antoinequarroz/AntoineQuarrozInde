import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const directory = resolve('.output/public/_nuxt')
const files = (await readdir(directory)).filter(file => file.endsWith('.js'))
const sizes = await Promise.all(files.map(async file => ({ file, bytes: (await stat(resolve(directory, file))).size })))
const total = sizes.reduce((sum, item) => sum + item.bytes, 0)
const largest = sizes.sort((a, b) => b.bytes - a.bytes)[0]
const maxSingle = Number(process.env.BUNDLE_MAX_SINGLE_BYTES || 2_400_000)
const maxTotal = Number(process.env.BUNDLE_MAX_TOTAL_BYTES || 6_500_000)
console.log(`Bundle budget: ${files.length} chunks, total ${total} bytes, largest ${largest?.file || 'n/a'} ${largest?.bytes || 0} bytes`)
if ((largest?.bytes || 0) > maxSingle || total > maxTotal) {
  console.error(`Bundle budget exceeded (single ${maxSingle}, total ${maxTotal}).`)
  process.exit(1)
}

const robotSources = await Promise.all([
  readFile(resolve('app/components/ui/SplineRobot.vue'), 'utf8'),
  readFile(resolve('app/components/sections/HeroSplineSection.vue'), 'utf8'),
])
const sceneUrls = [...new Set(robotSources.flatMap(source => source.match(/https:\/\/prod\.spline\.design\/[A-Za-z0-9_-]+\/scene\.splinecode/g) || []))]
const maxRobotScene = Number(process.env.ROBOT_SCENE_MAX_BYTES || 1_500_000)
if (!sceneUrls.length) throw new Error('Robot budget: no production Spline scene URL found.')
for (const url of sceneUrls) {
  let response
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15_000) })
      if (response.ok) break
    }
    catch {
      if (attempt === 2) throw new Error(`Robot budget: ${url} is unreachable.`)
    }
  }
  if (!response?.ok) throw new Error(`Robot budget: ${url} returned HTTP ${response?.status || 'unknown'}.`)
  let bytes = Number(response.headers.get('content-length') || 0)
  if (!bytes) {
    const download = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    if (!download.ok) throw new Error(`Robot budget: ${url} download returned HTTP ${download.status}.`)
    bytes = (await download.arrayBuffer()).byteLength
  }
  console.log(`Robot scene budget: ${bytes} bytes (max ${maxRobotScene})`)
  if (bytes > maxRobotScene) throw new Error(`Robot scene budget exceeded (${bytes} > ${maxRobotScene}).`)
}
