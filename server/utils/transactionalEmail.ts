import { Resend } from 'resend'

type TransactionalEmailInput = {
  to: string
  subject: string
  html: string
  idempotencyKey: string
  tags?: Array<{ name: string, value: string }>
}

export function escapeEmailHtml(value: unknown) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function portalEmailLayout(input: { preview: string, title: string, body: string, actionLabel?: string, actionUrl?: string }) {
  const action = input.actionLabel && input.actionUrl
    ? `<p style="margin:28px 0"><a href="${escapeEmailHtml(input.actionUrl)}" style="display:inline-block;border-radius:10px;background:#7c3aed;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">${escapeEmailHtml(input.actionLabel)}</a></p>`
    : ''
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeEmailHtml(input.preview)}</title></head><body style="margin:0;background:#f7f8ff;padding:24px 12px;font-family:Inter,Arial,sans-serif;color:#111827"><div style="display:none;max-height:0;overflow:hidden">${escapeEmailHtml(input.preview)}</div><main style="max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;background:#fff;padding:32px"><p style="margin:0 0 24px;color:#7c3aed;font-weight:700">Antoine Quarroz</p><h1 style="margin:0;font-size:26px;line-height:1.2">${escapeEmailHtml(input.title)}</h1><div style="margin-top:18px;color:#4b5563;line-height:1.7">${input.body}</div>${action}<p style="margin:28px 0 0;border-top:1px solid #e5e7eb;padding-top:18px;color:#6b7280;font-size:14px">Cet e-mail concerne votre collaboration avec Antoine Quarroz.</p></main></body></html>`
}

export async function sendTransactionalEmail(input: TransactionalEmailInput) {
  const config = useRuntimeConfig()
  if (!config.resendApiKey) throw createError({ statusCode: 503, message: 'Le service e-mail n’est pas configuré.' })
  const resend = new Resend(config.resendApiKey)
  const { data, error } = await resend.emails.send({
    from: 'Antoine Quarroz <info@antoinequarroz.ch>',
    to: input.to,
    subject: input.subject,
    html: input.html,
    tags: input.tags,
  }, { idempotencyKey: input.idempotencyKey.slice(0, 256) })
  if (error) throw createError({ statusCode: 502, message: error.message || 'L’e-mail n’a pas pu être envoyé.' })
  return { emailId: data?.id || null }
}

export async function notifyOperationalEvent(input: {
  organizationId: string
  subject: string
  title: string
  body: string
  action: string
  entityType: string
  entityId: string | number
  clientId?: number | null
  idempotencyKey: string
}) {
  const config = useRuntimeConfig()
  const recipient = String(config.contactEmail || '').trim()
  if (!recipient || !config.resendApiKey) return { sent: false, reason: 'not_configured' as const }
  try {
    const result = await sendTransactionalEmail({
      to: recipient,
      subject: input.subject,
      html: portalEmailLayout({ preview: input.subject, title: input.title, body: input.body }),
      idempotencyKey: input.idempotencyKey,
      tags: [{ name: 'category', value: 'portal_event' }],
    })
    await logAudit({ organizationId: input.organizationId, action: `${input.action}.notification_sent`, entityType: input.entityType, entityId: input.entityId, clientId: input.clientId, payload: { email_id: result.emailId } })
    return { sent: true, emailId: result.emailId }
  }
  catch (error) {
    console.error(`[notification] ${input.action} failed`, error)
    await logAudit({ organizationId: input.organizationId, action: `${input.action}.notification_failed`, entityType: input.entityType, entityId: input.entityId, clientId: input.clientId, payload: { message: error instanceof Error ? error.message : 'unknown' } })
    return { sent: false, reason: 'send_failed' as const }
  }
}

export async function notifyClientProjectUpdate(input: {
  organizationId: string
  projectId: number
  eventType: 'note' | 'deliverable' | 'milestone'
  eventId: number
  title: string
  message: string
}) {
  const supabase = getSupabaseAdmin()
  const { data: project } = await supabase.from('projects').select('id,title,client_id').eq('organization_id', input.organizationId).eq('id', input.projectId).maybeSingle()
  if (!project?.client_id) return { sent: false, reason: 'no_client' as const }
  const { data: client } = await supabase.from('clients').select('id,name,email,portal_access_disabled_at').eq('organization_id', input.organizationId).eq('id', project.client_id).maybeSingle()
  if (!client?.email || client.portal_access_disabled_at) return { sent: false, reason: 'no_recipient' as const }
  const siteUrl = String(useRuntimeConfig().public.siteUrl || '').replace(/\/+$/, '')
  try {
    const result = await sendTransactionalEmail({
      to: client.email,
      subject: `${project.title} — ${input.title}`,
      html: portalEmailLayout({
        preview: input.message,
        title: input.title,
        body: `<p>Bonjour ${escapeEmailHtml(client.name)},</p><p>${escapeEmailHtml(input.message)}</p>`,
        actionLabel: 'Voir mon espace client',
        actionUrl: `${siteUrl}/portal`,
      }),
      idempotencyKey: `project-${input.eventType}-${input.eventId}`,
      tags: [{ name: 'category', value: 'project_update' }],
    })
    await logAudit({ organizationId: input.organizationId, action: `project.${input.eventType}.client_notification_sent`, entityType: input.eventType, entityId: input.eventId, clientId: client.id, payload: { project_id: project.id, email_id: result.emailId } })
    return { sent: true, emailId: result.emailId }
  }
  catch (error) {
    console.error(`[notification] project ${input.eventType} failed`, error)
    await logAudit({ organizationId: input.organizationId, action: `project.${input.eventType}.client_notification_failed`, entityType: input.eventType, entityId: input.eventId, clientId: client.id, payload: { project_id: project.id, message: error instanceof Error ? error.message : 'unknown' } })
    return { sent: false, reason: 'send_failed' as const }
  }
}
