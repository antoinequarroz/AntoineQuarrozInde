export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  const supabase = getSupabaseAdmin()

  try {
    const databaseCheck = supabase
      .from('organizations')
      .select('id', { head: true, count: 'exact' })
      .limit(1)

    const result = await Promise.race([
      databaseCheck,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database health check timed out')), 4_000)),
    ])

    if (result.error) throw result.error

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
      checks: { application: 'ok', database: 'ok' },
    }
  }
  catch {
    setResponseStatus(event, 503)
    return {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
      checks: { application: 'ok', database: 'error' },
    }
  }
})
