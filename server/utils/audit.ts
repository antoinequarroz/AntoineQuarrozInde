type AuditInput = {
  organizationId: string
  actorUserId?: string | null
  action: string
  entityType: string
  entityId?: string | number | null
  clientId?: number | null
  payload?: Record<string, any> | null
}

export async function logAudit(input: AuditInput) {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.from('audit_logs').insert({
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId || null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId != null ? String(input.entityId) : null,
      client_id: input.clientId ?? null,
      payload: input.payload || {},
    })
  } catch (error) {
    console.error('[audit] insert failed', error)
  }
}
