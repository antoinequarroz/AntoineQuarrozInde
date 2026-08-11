import { readdir, readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

describe('Supabase production migration baseline', () => {
  it('keeps the repository history aligned with the audited production history', async () => {
    const baselineUrl = new URL('../supabase/production-migration-baseline.json', import.meta.url)
    const migrationsUrl = new URL('../supabase/migrations/', import.meta.url)
    const expected = JSON.parse(await readFile(baselineUrl, 'utf8')) as string[]
    const actual = (await readdir(migrationsUrl))
      .filter(filename => filename.endsWith('.sql'))
      .sort()

    expect(actual).toEqual(expected)
  })
})
