import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const VERSION_PATTERN = /^\d{14}$/
const ANSI_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g

export type SupabaseMigrationPlan = {
  status: 'aligned' | 'pending' | 'diverged'
  localVersions: string[]
  remoteVersions: string[]
  pendingVersions: string[]
  remoteOnlyVersions: string[]
  outOfOrderLocalVersions: string[]
}

function uniqueSorted(versions: string[]) {
  return [...new Set(versions)].sort()
}

export function parseSupabaseMigrationList(output: string): SupabaseMigrationPlan {
  const cleanOutput = output.replace(ANSI_PATTERN, '')
  const lines = cleanOutput.split(/\r?\n/)
  const headerIndex = lines.findIndex(line => /\blocal\b/i.test(line) && /\bremote\b/i.test(line))
  if (headerIndex < 0) throw new Error('Supabase migration list header is missing.')

  const localVersions: string[] = []
  const remoteVersions: string[] = []
  let parsedRows = 0

  for (const rawLine of lines.slice(headerIndex + 1)) {
    const line = rawLine.trim()
    if (!line || /^[\s─━═|+\-:]+$/.test(line)) continue
    const columns = rawLine.split(/[|│]/).map(value => value.replace(/[`\s]/g, ''))
    if (columns.length < 2) {
      if (/\d{14}/.test(line)) throw new Error(`Unrecognized Supabase migration row: ${line}`)
      continue
    }

    const local = columns[0] || ''
    const remote = columns[1] || ''
    if (!local && !remote) continue
    if ((local && !VERSION_PATTERN.test(local)) || (remote && !VERSION_PATTERN.test(remote))) {
      throw new Error(`Invalid Supabase migration version row: ${line}`)
    }
    if (local) localVersions.push(local)
    if (remote) remoteVersions.push(remote)
    parsedRows += 1
  }

  if (parsedRows === 0 && /\d{14}/.test(cleanOutput)) {
    throw new Error('Supabase migration versions were present but could not be parsed.')
  }

  const local = uniqueSorted(localVersions)
  const remote = uniqueSorted(remoteVersions)
  const localSet = new Set(local)
  const remoteSet = new Set(remote)
  const remoteOnlyVersions = remote.filter(version => !localSet.has(version))
  const latestRemote = remote.at(-1)
  const outOfOrderLocalVersions = latestRemote
    ? local.filter(version => !remoteSet.has(version) && version < latestRemote)
    : []
  const pendingVersions = local.filter(version => !remoteSet.has(version) && !outOfOrderLocalVersions.includes(version))
  const diverged = remoteOnlyVersions.length > 0 || outOfOrderLocalVersions.length > 0

  return {
    status: diverged ? 'diverged' : pendingVersions.length > 0 ? 'pending' : 'aligned',
    localVersions: local,
    remoteVersions: remote,
    pendingVersions,
    remoteOnlyVersions,
    outOfOrderLocalVersions,
  }
}

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath) throw new Error('Usage: node supabaseMigrationPlan.ts /path/to/migration-list.txt')
  const plan = parseSupabaseMigrationList(await readFile(inputPath, 'utf8'))
  process.stdout.write(`${JSON.stringify(plan)}\n`)
  if (plan.status === 'diverged') process.exitCode = 3
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 2
  })
}
