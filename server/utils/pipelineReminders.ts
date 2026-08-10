import { Resend } from 'resend'
import { logAudit } from './audit'
import { buildPipelineReminderPlan, type PipelineReminderCandidate } from './pipelineReminderPlan'

function todayInZurich() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function reminderEmail(candidate: PipelineReminderCandidate) {
  const name = escapeHtml(candidate.clientName)
  const number = escapeHtml(candidate.number)
  const dueDate = escapeHtml(candidate.dueDate)
  if (candidate.targetType === 'quote') {
    return {
      subject: candidate.urgency === 'due' ? `Dernier rappel pour le devis ${candidate.number}` : `Le devis ${candidate.number} arrive à échéance`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;line-height:1.6"><p>Bonjour ${name},</p><p>Je reviens vers vous concernant le devis <strong>${number}</strong>${candidate.title ? ` (${escapeHtml(candidate.title)})` : ''}, valable jusqu’au <strong>${dueDate}</strong>.</p><p>Si vous souhaitez avancer ou ajuster un point, je reste disponible pour organiser la suite.</p><p style="margin-top:24px">Antoine Quarroz<br>info@antoinequarroz.ch</p></div>`,
    }
  }

  const overdue = candidate.urgency === 'overdue'
  const balance = new Intl.NumberFormat('fr-CH', { style: 'currency', currency: candidate.currency || 'CHF' }).format(Number(candidate.balanceCents || 0) / 100)
  return {
    subject: overdue ? `Facture ${candidate.number} en attente de règlement` : `Rappel facture ${candidate.number}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;line-height:1.6"><p>Bonjour ${name},</p><p>${overdue ? 'Sauf erreur de ma part, la facture' : 'Petit rappel concernant la facture'} <strong>${number}</strong>, avec échéance au <strong>${dueDate}</strong>${overdue ? ', reste en attente de règlement.' : '.'}</p><p>Solde restant : <strong>${escapeHtml(balance)}</strong>.</p><p>Vous pouvez consulter la facture et ses moyens de paiement depuis votre espace client : <a href="https://www.antoinequarroz.ch/portal#factures">ouvrir mes factures</a>.</p><p>N’hésitez pas à me contacter si un point doit être clarifié.</p><p style="margin-top:24px">Antoine Quarroz<br>info@antoinequarroz.ch</p></div>`,
  }
}

async function loadReminderPlan(organizationId: string) {
  const supabase = getSupabaseAdmin()
  const [quotesResult, invoicesResult, clientsResult, sentResult, paymentsResult] = await Promise.all([
    supabase.from('quotes').select('id,number,title,client_id,valid_until,status').eq('organization_id', organizationId).eq('status', 'sent'),
    supabase.from('invoices').select('id,number,client_id,due_at,status,total_cents,amount_cents,currency,reminders_paused').eq('organization_id', organizationId).in('status', ['sent', 'overdue']),
    supabase.from('clients').select('id,name,email').eq('organization_id', organizationId),
    supabase.from('audit_logs').select('payload').eq('organization_id', organizationId).eq('action', 'pipeline_reminder_email').limit(10_000),
    supabase.from('invoice_payments').select('invoice_id,amount_cents,voided_at').eq('organization_id', organizationId),
  ])
  const error = [quotesResult.error, invoicesResult.error, clientsResult.error, sentResult.error, paymentsResult.error].find(Boolean)
  if (error) throw createError({ statusCode: 500, message: error.message })

  const sentReminderKeys = (sentResult.data || [])
    .map(row => String((row.payload as Record<string, unknown> | null)?.reminderKey || ''))
    .filter(Boolean)

  const paid = new Map<number, number>()
  for (const payment of paymentsResult.data || []) if (!payment.voided_at) paid.set(payment.invoice_id, (paid.get(payment.invoice_id) || 0) + Number(payment.amount_cents))
  const invoices = (invoicesResult.data || []).map(invoice => ({ ...invoice, balance_cents: Math.max(0, Number(invoice.total_cents ?? invoice.amount_cents ?? 0) - (paid.get(invoice.id) || 0)) }))
  return buildPipelineReminderPlan({
    today: todayInZurich(),
    clients: clientsResult.data || [],
    quotes: quotesResult.data || [],
    invoices,
    sentReminderKeys,
  })
}

export async function previewPipelineReminders(organizationId: string) {
  const plan = await loadReminderPlan(organizationId)
  return {
    automationEnabled: Boolean(process.env.PIPELINE_AUTOMATION_SECRET),
    generatedAt: new Date().toISOString(),
    candidates: plan.candidates.map(candidate => ({
      reminderKey: candidate.reminderKey,
      targetType: candidate.targetType,
      targetId: candidate.targetId,
      clientId: candidate.clientId,
      clientName: candidate.clientName,
      number: candidate.number,
      dueDate: candidate.dueDate,
      milestone: candidate.milestone,
      urgency: candidate.urgency,
      balanceCents: candidate.balanceCents,
      currency: candidate.currency,
    })),
    skipped: plan.skipped,
  }
}

export async function runPipelineReminders(input: {
  organizationId: string
  actorUserId?: string | null
  actorEmail?: string | null
  trigger: 'manual' | 'scheduled'
}) {
  const config = useRuntimeConfig()
  if (!config.resendApiKey) throw createError({ statusCode: 500, message: 'RESEND_API_KEY manquante' })

  const supabase = getSupabaseAdmin()
  const today = todayInZurich()
  const { data: newlyOverdue, error: overdueError } = await supabase
    .from('invoices')
    .update({ status: 'overdue' })
    .eq('organization_id', input.organizationId)
    .eq('status', 'sent')
    .lt('due_at', today)
    .select('id')
  if (overdueError) throw createError({ statusCode: 500, message: overdueError.message })

  const plan = await loadReminderPlan(input.organizationId)
  const resend = new Resend(config.resendApiKey)
  let sentCount = 0
  let failedCount = 0

  for (const candidate of plan.candidates) {
    const email = reminderEmail(candidate)
    const { error } = await resend.emails.send({
      from: 'Antoine Quarroz <info@antoinequarroz.ch>',
      to: candidate.email,
      subject: email.subject,
      html: email.html,
    })
    if (error) {
      failedCount += 1
      continue
    }
    sentCount += 1
    await logAudit({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId || null,
      action: 'pipeline_reminder_email',
      entityType: candidate.targetType,
      entityId: candidate.targetId,
      clientId: candidate.clientId,
      payload: {
        reminderKey: candidate.reminderKey,
        targetType: candidate.targetType,
        targetId: candidate.targetId,
        number: candidate.number,
        milestone: candidate.milestone,
        trigger: input.trigger,
      },
    })
  }

  const skippedCount = plan.skipped.alreadySent + plan.skipped.missingContact + plan.skipped.outsideMilestone + plan.skipped.paused
  const result = {
    sentCount,
    failedCount,
    skippedCount,
    candidateCount: plan.candidates.length,
    overdueMarkedCount: newlyOverdue?.length || 0,
    trigger: input.trigger,
  }
  await logAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId || null,
    action: 'pipeline_reminder_run',
    entityType: 'pipeline',
    payload: { ...result, actorEmail: input.actorEmail || null, date: today },
  })
  return result
}
