import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { buildRobotsPolicy } from '../server/utils/robotsPolicy'

const execFileAsync = promisify(execFile)
const servers: ReturnType<typeof createServer>[] = []
const unixIt = process.platform === 'win32' ? it.skip : it

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })))
})

async function listen(robots: string | ((origin: string) => string), sitemapStatus = 200) {
  let origin = ''
  const server = createServer((request, response) => {
    if (request.url === '/robots.txt') {
      response.setHeader('Content-Type', 'text/plain; charset=UTF-8')
      response.end(typeof robots === 'function' ? robots(origin) : robots)
      return
    }
    if (request.url === '/sitemap.xml') {
      response.statusCode = sitemapStatus
      response.end('<urlset/>')
      return
    }
    response.statusCode = 404
    response.end('not found')
  })
  servers.push(server)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not expose a TCP port')
  origin = `http://127.0.0.1:${address.port}`
  return origin
}

function policyFor(origin: string) {
  return buildRobotsPolicy(origin)
}

function runProof(origin: string) {
  return execFileAsync('bash', [
    'scripts/ops/verify-openai-robots-policy.sh',
    origin,
  ], { cwd: process.cwd() })
}

type RobotsGroup = {
  agents: string[]
  allow: string[]
  disallow: string[]
}

function parseRobots(body: string) {
  const groups: RobotsGroup[] = []
  const sitemaps: string[] = []
  let agents: string[] = []
  let allow: string[] = []
  let disallow: string[] = []

  const flush = () => {
    if (agents.length > 0) groups.push({ agents, allow, disallow })
    agents = []
    allow = []
    disallow = []
  }

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) {
      flush()
      continue
    }

    const separator = line.indexOf(':')
    if (separator < 0) continue
    const field = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (field === 'user-agent') {
      if (allow.length > 0 || disallow.length > 0) flush()
      agents.push(value.toLowerCase())
    }
    else if (field === 'allow') {
      allow.push(value)
    }
    else if (field === 'disallow') {
      disallow.push(value)
    }
    else if (field === 'sitemap') {
      flush()
      sitemaps.push(value)
    }
  }
  flush()

  return { groups, sitemaps }
}

function groupFor(groups: RobotsGroup[], agent: string) {
  return groups.filter(group => group.agents.includes(agent.toLowerCase()))
}

describe('AQ-SEO-003 OpenAI crawler policy', () => {
  it('keeps search, training and generic crawler decisions independent', () => {
    const policy = parseRobots(buildRobotsPolicy('https://www.antoinequarroz.ch/'))

    expect(groupFor(policy.groups, 'OAI-SearchBot')).toEqual([{
      agents: ['oai-searchbot'],
      allow: ['/'],
      disallow: [],
    }])
    expect(groupFor(policy.groups, 'GPTBot')).toEqual([{
      agents: ['gptbot'],
      allow: [],
      disallow: ['/'],
    }])
    expect(groupFor(policy.groups, '*')).toEqual([{
      agents: ['*'],
      allow: ['/'],
      disallow: [],
    }])
  })

  it('declares the canonical sitemap exactly once', () => {
    const policy = parseRobots(buildRobotsPolicy('https://www.antoinequarroz.ch///'))

    expect(policy.sitemaps).toEqual(['https://www.antoinequarroz.ch/sitemap.xml'])
  })

  it('does not add a policy for user-triggered ChatGPT visits', () => {
    expect(buildRobotsPolicy('https://www.antoinequarroz.ch')).not.toContain('ChatGPT-User')
  })

  it('runs the OpenAI proof after the existing production proofs', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8')
    const privateProof = 'bash scripts/ops/verify-private-noindex.sh https://www.antoinequarroz.ch'
    const openAiProof = 'bash scripts/ops/verify-openai-robots-policy.sh https://www.antoinequarroz.ch'

    expect(workflow).toContain(openAiProof)
    expect(workflow.indexOf(privateProof)).toBeLessThan(workflow.indexOf(openAiProof))
  })

  it('keeps the production proof independent from the containerized Node runtime', async () => {
    const proof = await readFile('scripts/ops/verify-openai-robots-policy.sh', 'utf8')

    expect(proof).toContain('awk -v expected_sitemap=')
    expect(proof).not.toMatch(/(^|\s)node(\s|$)/)
  })

  it('documents the approved decision, limits and rollback', async () => {
    const operations = await readFile('docs/operations.md', 'utf8')

    expect(operations).toContain('OD-SEO-003')
    expect(operations).toContain('OAI-SearchBot')
    expect(operations).toContain('GPTBot')
    expect(operations).toContain('ChatGPT-User')
    expect(operations).toContain('antoinequarroz-web:previous')
    expect(operations).toContain('https://developers.openai.com/api/docs/bots')
  })

  unixIt('accepts the independent crawler policy and available sitemap', async () => {
    const origin = await listen(policyFor)

    const result = await runProof(origin)

    expect(result.stdout).toContain('OpenAI robots policy and canonical sitemap are valid')
  })

  unixIt.each([
    ['GPTBot allowed', (body: string) => body.replace('User-agent: GPTBot\nDisallow: /', 'User-agent: GPTBot\nAllow: /')],
    ['OAI-SearchBot denied', (body: string) => body.replace('User-agent: OAI-SearchBot\nAllow: /', 'User-agent: OAI-SearchBot\nDisallow: /')],
    ['OAI-SearchBot absent', (body: string) => body.replace('User-agent: OAI-SearchBot\nAllow: /\n\n', '')],
    ['GPTBot duplicated', (body: string) => `${body}\nUser-agent: GPTBot\nDisallow: /\n`],
    ['generic crawler denied', (body: string) => body.replace('User-agent: *\nAllow: /', 'User-agent: *\nDisallow: /')],
    ['sitemap non-canonical', (body: string) => body.replace('/sitemap.xml', '/wrong-sitemap.xml')],
  ])('rejects a contradictory policy: %s', async (_name, mutate) => {
    const origin = await listen(value => mutate(policyFor(value)))

    await expect(runProof(origin)).rejects.toMatchObject({ code: 1 })
  })

  unixIt('rejects an unavailable sitemap', async () => {
    const origin = await listen(policyFor, 503)

    await expect(runProof(origin)).rejects.toMatchObject({ code: 22 })
  })

  unixIt('rejects unsafe origins and unavailable destinations', async () => {
    await expect(runProof('https://user@example.com')).rejects.toMatchObject({ code: 64 })
    await expect(runProof('http://127.0.0.1:9')).rejects.toMatchObject({ code: 7 })
  })
})
