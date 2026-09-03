import { execFile } from 'node:child_process'
import { chmod, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const unixIt = process.platform === 'win32' ? it.skip : it
const script = 'scripts/ops/promote-supabase-migrations.sh'
const sha = 'a'.repeat(40)

const alignedTable = `Local | Remote | Time (UTC)
20260801000000 | 20260801000000 | 2026-08-01 00:00:00
20260802000000 | 20260802000000 | 2026-08-02 00:00:00
`
const pendingTable = `Local | Remote | Time (UTC)
20260801000000 | 20260801000000 | 2026-08-01 00:00:00
20260802000000 |                | 2026-08-02 00:00:00
`
const divergedTable = `Local | Remote | Time (UTC)
20260801000000 | 20260801000000 | 2026-08-01 00:00:00
               | 20260802000000 | 2026-08-02 00:00:00
`

async function fixture(scenario: 'aligned' | 'pending' | 'diverged' | 'dump-failure' | 'push-failure' | 'verification-failure') {
  const root = await mkdtemp(join(tmpdir(), 'aq060-promotion-test-'))
  const bin = join(root, 'bin')
  const artifacts = join(root, 'artifacts')
  const log = join(root, 'calls.log')
  const state = join(root, 'state')
  await execFileAsync('mkdir', ['-p', bin, artifacts])

  const fakeNpx = `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$AQ_FAKE_LOG"
args="$*"
if [[ "$args" == *" migration list "* ]]; then
  count=0; [[ -f "$AQ_FAKE_STATE" ]] && count="$(cat "$AQ_FAKE_STATE")"
  count=$((count + 1)); printf '%s' "$count" > "$AQ_FAKE_STATE"
  if [[ "$AQ_FAKE_SCENARIO" == "diverged" || ( "$AQ_FAKE_SCENARIO" == "verification-failure" && "$count" -gt 1 ) ]]; then printf '%s' "$AQ_DIVERGED_TABLE"
  elif [[ "$AQ_FAKE_SCENARIO" == "aligned" || "$count" -gt 1 ]]; then printf '%s' "$AQ_ALIGNED_TABLE"
  else printf '%s' "$AQ_PENDING_TABLE"; fi
elif [[ "$args" == *" db dump "* ]]; then
  [[ "$AQ_FAKE_SCENARIO" != "dump-failure" ]] || exit 7
  file=""; previous=""
  for value in "$@"; do [[ "$previous" == "--file" ]] && file="$value"; previous="$value"; done
  printf '%s\\n' '-- safe fixture dump' > "$file"
elif [[ "$args" == *" db push "* && "$args" != *" --dry-run "* ]]; then
  [[ "$AQ_FAKE_SCENARIO" != "push-failure" ]] || exit 8
fi
`
  const fakeAge = `#!/usr/bin/env bash
set -euo pipefail
output=""; input=""; previous=""
for value in "$@"; do
  [[ "$previous" == "--output" ]] && output="$value"
  [[ "$value" != --* && "$previous" != "--recipient" && "$previous" != "--output" ]] && input="$value"
  previous="$value"
done
cp "$input" "$output"
`
  await writeFile(join(bin, 'npx'), fakeNpx)
  await writeFile(join(bin, 'age'), fakeAge)
  await chmod(join(bin, 'npx'), 0o755)
  await chmod(join(bin, 'age'), 0o755)

  return {
    root,
    artifacts,
    log,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      RUNNER_TEMP: root,
      GITHUB_SHA: sha,
      SUPABASE_ACCESS_TOKEN: 'access-token-secret',
      SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
      SUPABASE_BACKUP_AGE_RECIPIENT: `age1${'q'.repeat(40)}`,
      AQ_FAKE_LOG: log,
      AQ_FAKE_STATE: state,
      AQ_FAKE_SCENARIO: scenario,
      AQ_ALIGNED_TABLE: alignedTable,
      AQ_PENDING_TABLE: pendingTable,
      AQ_DIVERGED_TABLE: divergedTable,
    },
  }
}

describe('AQ-060 Supabase migration promotion', () => {
  it('keeps the GitHub workflow free of plaintext database backup artifacts', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8')
    const promotionScript = await readFile(script, 'utf8')
    expect(workflow).toContain('supabase-pre-migration-${{ github.sha }}')
    expect(workflow).toContain('aq060-migration-artifacts/*')
    expect(workflow).not.toMatch(/path:.*\.(?:sql|tar\.gz)\s*$/m)
    expect(promotionScript).not.toMatch(/export (?:HOME|USERPROFILE)=/)
  })

  unixIt('does not dump or push when production is already aligned', async () => {
    const test = await fixture('aligned')
    const result = await execFileAsync('bash', [script, test.artifacts], { cwd: process.cwd(), env: test.env })
    const calls = await readFile(test.log, 'utf8')
    const manifest = JSON.parse(await readFile(join(test.artifacts, 'migration-manifest.json'), 'utf8'))

    expect(result.stdout).toContain('already aligned')
    expect(calls).toContain('db push --linked --dry-run')
    expect(calls).not.toContain('db dump')
    expect(calls).not.toMatch(/db push --linked --yes/)
    expect(manifest).toMatchObject({ state: 'aligned', backup_created: false })
  })

  unixIt('backs up, encrypts, pushes and verifies pending migrations in order', async () => {
    const test = await fixture('pending')
    const result = await execFileAsync('bash', [script, test.artifacts], { cwd: process.cwd(), env: test.env })
    const calls = await readFile(test.log, 'utf8')
    const files = await readdir(test.artifacts)
    const manifest = JSON.parse(await readFile(join(test.artifacts, 'migration-manifest.json'), 'utf8'))

    expect(result.stdout).toContain('promoted: 1 version(s)')
    expect(calls.indexOf('db push --linked --dry-run')).toBeLessThan(calls.indexOf('db dump --linked'))
    expect(calls.indexOf('db dump --linked')).toBeLessThan(calls.indexOf('db push --linked --yes'))
    expect(files).toContain(`supabase-pre-migration-${sha}.tar.gz.age`)
    expect(files).toContain(`supabase-pre-migration-${sha}.tar.gz.age.sha256`)
    expect(files.some(file => file.endsWith('.sql') || file.endsWith('.tar.gz'))).toBe(false)
    expect(manifest).toMatchObject({
      state: 'promoted',
      backup_created: true,
      plan: { status: 'pending', pendingVersions: ['20260802000000'] },
    })
    expect(`${result.stdout}${result.stderr}`).not.toContain('access-token-secret')
    expect(calls).not.toContain('--password')
  })

  unixIt('refuses divergent histories before backup or push', async () => {
    const test = await fixture('diverged')
    await expect(execFileAsync('bash', [script, test.artifacts], { cwd: process.cwd(), env: test.env }))
      .rejects.toMatchObject({ code: 65 })
    const calls = await readFile(test.log, 'utf8')
    expect(calls).not.toContain('db dump')
    expect(calls).not.toMatch(/db push --linked --yes/)
  })

  unixIt('blocks promotion when the clear backup cannot be created', async () => {
    const test = await fixture('dump-failure')
    await expect(execFileAsync('bash', [script, test.artifacts], { cwd: process.cwd(), env: test.env }))
      .rejects.toMatchObject({ code: 1 })
    const calls = await readFile(test.log, 'utf8')
    const files = await readdir(test.artifacts)

    expect(calls).toContain('db dump --linked')
    expect(calls).not.toMatch(/db push --linked --yes/)
    expect(files.some(file => file.endsWith('.sql') || file.endsWith('.tar.gz') || file.endsWith('.age'))).toBe(false)
  })

  unixIt('keeps only the encrypted recovery artifact when a push fails', async () => {
    const test = await fixture('push-failure')
    await expect(execFileAsync('bash', [script, test.artifacts], { cwd: process.cwd(), env: test.env }))
      .rejects.toMatchObject({ code: 1 })
    const files = await readdir(test.artifacts)
    const manifest = JSON.parse(await readFile(join(test.artifacts, 'migration-manifest.json'), 'utf8'))
    expect(files).toContain(`supabase-pre-migration-${sha}.tar.gz.age`)
    expect(files.some(file => file.endsWith('.sql') || file.endsWith('.tar.gz'))).toBe(false)
    expect(manifest.state).toBe('push_failed')
  })

  unixIt('blocks application delivery when post-push history is not aligned', async () => {
    const test = await fixture('verification-failure')
    await expect(execFileAsync('bash', [script, test.artifacts], { cwd: process.cwd(), env: test.env }))
      .rejects.toMatchObject({ code: 65 })
    const calls = await readFile(test.log, 'utf8')
    const manifest = JSON.parse(await readFile(join(test.artifacts, 'migration-manifest.json'), 'utf8'))

    expect(calls).toMatch(/db push --linked --yes/)
    expect(manifest).toMatchObject({ state: 'verification_failed', backup_created: true })
  })
})
