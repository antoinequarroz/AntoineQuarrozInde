type BackfillResult = {
  clientsInserted: number
  tasksInserted: number
  quotesInserted: number
  invoicesInserted: number
  appointmentsInserted: number
}

type BackfillSourceRow = {
  id: number
  client_id?: number | null
  created_at?: string | null
}

type BackfillExistingLogRow = {
  entity_id: string | null
  payload: Record<string, any> | null
}

async function insertBackfillLogs(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  orgId: string,
  sourceTable: 'clients' | 'tasks' | 'quotes' | 'invoices' | 'appointments',
  action: string,
  entityType: string,
) {
  const { data: sourceRows, error: sourceError } = await supabase
    .from(sourceTable)
    .select(sourceTable === 'clients' ? 'id, created_at' : 'id, client_id, created_at')
    .eq('organization_id', orgId)

  if (sourceError) throw createError({ statusCode: 500, message: sourceError.message })
  const typedSourceRows = (sourceRows || []) as BackfillSourceRow[]
  if (!typedSourceRows.length) return 0

  const { data: existingRows, error: existingError } = await supabase
    .from('audit_logs')
    .select('entity_id, payload')
    .eq('organization_id', orgId)
    .eq('action', action)
    .eq('entity_type', entityType)

  if (existingError) throw createError({ statusCode: 500, message: existingError.message })
  const typedExistingRows = (existingRows || []) as BackfillExistingLogRow[]

  const existingBackfillIds = new Set(
    typedExistingRows
      .filter(row => row?.payload?.source === 'backfill')
      .map(row => row.entity_id)
      .filter((value): value is string => Boolean(value)),
  )

  const rowsToInsert = typedSourceRows
    .filter(row => !existingBackfillIds.has(String(row.id)))
    .map((row) => ({
      organization_id: orgId,
      actor_user_id: null,
      action,
      entity_type: entityType,
      entity_id: String(row.id),
      client_id: sourceTable === 'clients' ? row.id : row.client_id ?? null,
      payload: { source: 'backfill', table: sourceTable },
      created_at: row.created_at || new Date().toISOString(),
    }))

  if (!rowsToInsert.length) return 0

  const { data: insertedRows, error: insertError } = await supabase
    .from('audit_logs')
    .insert(rowsToInsert)
    .select('id')

  if (insertError) throw createError({ statusCode: 500, message: insertError.message })
  return (insertedRows || []).length
}

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()

  const result: BackfillResult = {
    clientsInserted: await insertBackfillLogs(supabase, org.id, 'clients', 'client_created', 'client'),
    tasksInserted: await insertBackfillLogs(supabase, org.id, 'tasks', 'task_created', 'task'),
    quotesInserted: await insertBackfillLogs(supabase, org.id, 'quotes', 'quote_created', 'quote'),
    invoicesInserted: await insertBackfillLogs(supabase, org.id, 'invoices', 'invoice_created', 'invoice'),
    appointmentsInserted: await insertBackfillLogs(supabase, org.id, 'appointments', 'appointment_created', 'appointment'),
  }

  await logAudit({
    organizationId: org.id,
    actorUserId: user.id,
    action: 'audit_backfill_run',
    entityType: 'audit_maintenance',
    payload: {
      source: 'system',
      actorEmail: user.email || null,
      ...result,
    },
  })

  return result
})
