import { Resend } from 'resend'
import { logAudit } from '../../../utils/audit'

function daysFromNow(dateIso: string) {
  const now = new Date()
  const d = new Date(dateIso)
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const config = useRuntimeConfig()
  if (!config.resendApiKey) {
    throw createError({ statusCode: 500, message: 'RESEND_API_KEY manquante' })
  }

  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: quotesRows }, { data: invoicesRows }, { data: clientsRows }, { data: sentRows }] = await Promise.all([
    supabase.from('quotes').select('id,number,title,client_id,valid_until,status').eq('organization_id', org.id).eq('status', 'sent'),
    supabase.from('invoices').select('id,number,client_id,due_at,status').eq('organization_id', org.id).in('status', ['sent', 'overdue']),
    supabase.from('clients').select('id,name,email').eq('organization_id', org.id),
    supabase.from('audit_logs').select('payload').eq('organization_id', org.id).eq('action', 'pipeline_reminder_email').gte('created_at', `${today}T00:00:00.000Z`),
  ])

  const clientsById = new Map((clientsRows || []).map(c => [Number(c.id), c]))
  const alreadySent = new Set(
    (sentRows || [])
      .map((r: any) => r.payload || {})
      .filter((p: any) => p?.targetType && p?.targetId)
      .map((p: any) => `${p.targetType}:${p.targetId}`),
  )

  const resend = new Resend(config.resendApiKey)
  let sentCount = 0
  let skippedCount = 0
  let failedCount = 0

  for (const q of quotesRows || []) {
    if (!q.valid_until || !q.client_id) {
      skippedCount++
      continue
    }
    const delta = daysFromNow(q.valid_until)
    if (delta < 0 || delta > 3) continue
    const dedupe = `quote:${q.id}`
    if (alreadySent.has(dedupe)) {
      skippedCount++
      continue
    }
    const client = clientsById.get(Number(q.client_id))
    if (!client?.email) {
      skippedCount++
      continue
    }

    const subject = `Rappel devis ${q.number} - validite proche`
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827">
        <p>Bonjour ${escapeHtml(client.name || '')},</p>
        <p>Petit rappel concernant le devis <strong>${escapeHtml(q.number)}</strong> (${escapeHtml(q.title)}) qui arrive a echeance le <strong>${escapeHtml(q.valid_until)}</strong>.</p>
        <p>Si vous souhaitez avancer, je peux lancer la suite des cette semaine.</p>
        <p style="margin-top:20px">Antoine Quarroz<br/>info@antoinequarroz.ch</p>
      </div>
    `
    const { error } = await resend.emails.send({
      from: 'Antoine Quarroz <info@antoinequarroz.ch>',
      to: client.email,
      subject,
      html,
    })
    if (error) {
      failedCount++
      continue
    }
    sentCount++
    alreadySent.add(dedupe)
    await logAudit({
      organizationId: org.id,
      actorUserId: user?.id || null,
      action: 'pipeline_reminder_email',
      entityType: 'quote',
      entityId: q.id,
      clientId: Number(q.client_id),
      payload: { targetType: 'quote', targetId: q.id, number: q.number, email: client.email },
    })
  }

  for (const inv of invoicesRows || []) {
    if (!inv.due_at || !inv.client_id) {
      skippedCount++
      continue
    }
    const delta = daysFromNow(inv.due_at)
    if (delta > 2) continue
    const dedupe = `invoice:${inv.id}`
    if (alreadySent.has(dedupe)) {
      skippedCount++
      continue
    }
    const client = clientsById.get(Number(inv.client_id))
    if (!client?.email) {
      skippedCount++
      continue
    }

    const subject = `Rappel facture ${inv.number}`
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827">
        <p>Bonjour ${escapeHtml(client.name || '')},</p>
        <p>Petit rappel concernant la facture <strong>${escapeHtml(inv.number)}</strong>, echeance <strong>${escapeHtml(inv.due_at)}</strong>.</p>
        <p>N'hesitez pas si vous souhaitez un recapitulatif ou un ajustement.</p>
        <p style="margin-top:20px">Antoine Quarroz<br/>info@antoinequarroz.ch</p>
      </div>
    `
    const { error } = await resend.emails.send({
      from: 'Antoine Quarroz <info@antoinequarroz.ch>',
      to: client.email,
      subject,
      html,
    })
    if (error) {
      failedCount++
      continue
    }
    sentCount++
    alreadySent.add(dedupe)
    await logAudit({
      organizationId: org.id,
      actorUserId: user?.id || null,
      action: 'pipeline_reminder_email',
      entityType: 'invoice',
      entityId: inv.id,
      clientId: Number(inv.client_id),
      payload: { targetType: 'invoice', targetId: inv.id, number: inv.number, email: client.email },
    })
  }

  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id || null,
    action: 'pipeline_reminder_run',
    entityType: 'pipeline',
    payload: { sentCount, skippedCount, failedCount, date: today, actorEmail: user?.email || null },
  })

  return { sentCount, skippedCount, failedCount }
})
