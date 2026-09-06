import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const projectDir = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function createBackupFixture(rowCountOverride?: number) {
  const root = await mkdtemp(join(tmpdir(), 'aq-backup-recovery-'))
  temporaryDirectories.push(root)
  const content = join(root, 'content')
  await mkdir(join(content, 'storage/media/uploads'), { recursive: true })

  const tables = ['organizations', 'clients', 'projects', 'quotes', 'quote_items', 'invoices', 'invoice_items', 'invoice_payments']
  const tableRows = Object.fromEntries(tables.map(table => [table, table === 'organizations' ? (rowCountOverride ?? 1) : 0]))
  for (const table of tables) {
    const rows = table === 'organizations' ? [{ id: '00000000-0000-0000-0000-000000000001' }] : []
    await writeFile(join(content, `${table}.json`), JSON.stringify(rows))
  }
  await writeFile(join(content, 'auth-users.json'), '[]')
  await writeFile(join(content, 'manifest.json'), JSON.stringify({
    created_at: '2026-09-06T00:00:00Z',
    git_revision: 'a'.repeat(40),
    format: 3,
    tables: tables.length,
    table_rows: tableRows,
    auth_inventory: true,
    auth_users: 0,
    storage_objects: 0,
  }))

  const archive = join(root, 'aq-supabase-20260906T000000Z.tar.gz')
  const tar = spawnSync('tar', ['-C', content, '-czf', archive, '.'], { encoding: 'utf8' })
  expect(tar.status, tar.stderr).toBe(0)
  const digest = createHash('sha256').update(await readFile(archive)).digest('hex')
  await writeFile(`${archive}.sha256`, `${digest}  ${archive.split('/').at(-1)}\n`)
  return archive
}

describe('verified backup recovery', () => {
  it('records exact row counts and keeps checksums portable', async () => {
    const backup = await readFile(join(projectDir, 'scripts/ops/backup-supabase.sh'), 'utf8')
    expect(backup).toContain('Prefer: count=exact')
    expect(backup).toContain('Incomplete backup for $table')
    expect(backup).toContain('format:3')
    expect(backup).toContain('table_rows:$table_rows')
    expect(backup).toContain('sha256sum "$(basename "$ARCHIVE")"')
  })

  it('accepts a complete format 3 archive and rejects a row-count mismatch', async () => {
    const validArchive = await createBackupFixture()
    const valid = spawnSync(join(projectDir, 'scripts/ops/verify-backup.sh'), [validArchive], { encoding: 'utf8' })
    expect(valid.status, valid.stderr).toBe(0)

    const invalidArchive = await createBackupFixture(2)
    const invalid = spawnSync(join(projectDir, 'scripts/ops/verify-backup.sh'), [invalidArchive], { encoding: 'utf8' })
    expect(invalid.status).not.toBe(0)
    expect(invalid.stderr).toContain('Row count mismatch for organizations')
  })

  it('keeps foreign-key checks scoped to the referenced id arrays', async () => {
    const restoreDrill = await readFile(join(projectDir, 'scripts/ops/restore-drill.sh'), 'utf8')
    expect(restoreDrill).toContain('.client_id as $foreign_id')
    expect(restoreDrill).toContain('$client_ids | index($foreign_id)')
    expect(restoreDrill).not.toContain('$client_ids | index(.client_id)')
  })

  it('downloads the remote private copy and never writes to production data', async () => {
    const remoteDrillPath = join(projectDir, 'scripts/ops/restore-supabase-copy-drill.sh')
    const remoteDrill = await readFile(remoteDrillPath, 'utf8')
    expect(remoteDrill).toContain('/storage/v1/object/list/backups')
    expect(remoteDrill).toContain('/storage/v1/object/authenticated/backups/database/$object')
    expect(remoteDrill).not.toMatch(/\/rest\/v1\/.+-(X|--request)\s+(POST|PUT|PATCH|DELETE)/)

    const scheduled = await readFile(join(projectDir, 'scripts/ops/scheduled-restore-drill.sh'), 'utf8')
    expect(scheduled).toContain('restore-supabase-copy-drill.sh')
    expect(scheduled).toContain('restore-offsite-drill.sh')
  })
})
