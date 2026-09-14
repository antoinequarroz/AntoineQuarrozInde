import { logAudit } from './audit'
import { buildPipelineReminderPlan, type PipelineReminderCandidate } from './pipelineReminderPlan'

export type PipelineReminderConfirmation = {
  reminderKey: string
  email: string
  subject: string
  bodyText: string
}

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

export function buildPipelineReminderMessage(candidate: PipelineReminderCandidate) {
  const name = escapeHtml(candidate.clientName)
  const number = escapeHtml(candidate.number)
  const dueDate = escapeHtml(candidate.dueDate)
  if (candidate.targetType === 'lead') {
    const displayName = candidate.clientName.trim()
    const textGreeting = displayName ? `Bonjour ${displayName},` : 'Bonjour,'
    const htmlGreeting = name ? `Bonjour ${name},` : 'Bonjour,'
    return {
      subject: 'Suite à notre échange',
      text: `${textGreeting}\n\nJe me permets de revenir vers vous pour savoir où en est votre réflexion et si je peux vous aider à avancer sur votre projet.\n\nJe reste disponible si vous souhaitez en discuter ou préciser un point.\n\nAntoine Quarroz\ninfo@antoinequarroz.ch`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;line-height:1.6"><p>${htmlGreeting}</p><p>Je me permets de revenir vers vous pour savoir où en est votre réflexion et si je peux vous aider à avancer sur votre projet.</p><p>Je reste disponible si vous souhaitez en discuter ou préciser un point.</p><p style="margin-top:24px">Antoine Quarroz<br>info@antoinequarroz.ch</p></div>`,
    }
  }
  if (candidate.targetType === 'quote') {
    return {
      subject: candidate.urgency === 'due' ? `Dernier rappel pour le devis ${candidate.number}` : `Le devis ${candidate.number} arrive à échéance`,
      text: `Bonjour ${candidate.clientName},\n\nJe reviens vers vous concernant le devis ${candidate.number}${candidate.title ? ` (${candidate.title})` : ''}, valable jusqu’au ${candidate.dueDate}.\n\nSi vous souhaitez avancer ou ajuster un point, je reste disponible pour organiser la suite.\n\nAntoine Quarroz\ninfo@antoinequarroz.ch`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;line-height:1.6"><p>Bonjour ${name},</p><p>Je reviens vers vous concernant le devis <strong>${number}</strong>${candidate.title ? ` (${escapeHtml(candidate.title)})` : ''}, valable jusqu’au <strong>${dueDate}</strong>.</p><p>Si vous souhaitez avancer ou ajuster un point, je reste disponible pour organiser la suite.</p><p style="margin-top:24px">Antoine Quarroz<br>info@antoinequarroz.ch</p></div>`,
    }
  }

  const overdue = candidate.urgency === 'overdue'
  const balance = new Intl.NumberFormat('fr-CH', { style: 'currency', currency: candidate.currency || 'CHF' }).format(Number(candidate.balanceCents || 0) / 100)
  return {
    subject: overdue ? `Facture ${candidate.number} en attente de règlement` : `Rappel facture ${candidate.number}`,
    text: `Bonjour ${candidate.clientName},\n\n${overdue ? 'Sauf erreur de ma part, la facture' : 'Petit rappel concernant la facture'} ${candidate.number}, avec échéance au ${candidate.dueDate}${overdue ? ', reste en attente de règlement.' : '.'}\n\nSolde restant : ${balance}.\n\nVous pouvez consulter la facture et ses moyens de paiement depuis votre espace client : https://www.antoinequarroz.ch/portal#factures\n\nN’hésitez pas à me contacter si un point doit être clarifié.\n\nAntoine Quarroz\ninfo@antoinequarroz.ch`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;line-height:1.6"><p>Bonjour ${name},</p><p>${overdue ? 'Sauf erreur de ma part, la facture' : 'Petit rappel concernant la facture'} <strong>${number}</strong>, avec échéance au <strong>${dueDate}</strong>${overdue ? ', reste en attente de règlement.' : '.'}</p><p>Solde restant : <strong>${escapeHtml(balance)}</strong>.</p><p>Vous pouvez consulter la facture et ses moyens de paiement depuis votre espace client : <a href="https://www.antoinequarroz.ch/portal#factures">ouvrir mes factures</a>.</p><p>N’hésitez pas à me contacter si un point doit être clarifié.</p><p style="margin-top:24px">Antoine Quarroz<br>info@antoinequarroz.ch</p></div>`,
  }
}

export function confirmationMatchesCandidate(candidate: PipelineReminderCandidate, confirmation: PipelineReminderConfirmation) {
  return confirmation.reminderKey === candidate.reminderKey
    && confirmation.email === candidate.email
    && confirmation.subject.trim().length > 0
    && confirmation.subject.length <= 200
    && confirmation.bodyText.trim().length > 0
    && confirmation.bodyText.length <= 5_000
}

export function buildConfirmedPipelineReminderMessage(confirmation: PipelineReminderConfirmation) {
  const subject = confirmation.subject.trim()
  const text = confirmation.bodyText.trim()
  return {
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;line-height:1.6;white-space:pre-wrap">${escapeHtml(text)}</div>`,
  }
}

async function loadReminderPlan(organizationId: string) {
  const supabase = getSupabaseAdmin()
  const [quotesResult, invoicesResult, clientsResult, sentResult, paymentsResult] = await Promise.all([
    supabase.from('quotes').select('id,number,title,client_id,valid_until,status').eq('organization_id', organizationId).eq('status', 'sent'),
    supabase.from('invoices').select('id,number,client_id,due_at,status,total_cents,amount_cents,currency,reminders_paused').eq('organization_id', organizationId).in('status', ['sent', 'overdue']),
    supabase.from('clients').select('id,name,email,status,next_follow_up_at,follow_up_note').eq('organization_id', organizationId),
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

export function selectPipelineReminderCandidates(candidates: PipelineReminderCandidate[], reminderKeys?: string[]) {
  if (!reminderKeys) return candidates
  const requestedKeys = new Set(reminderKeys)
  return candidates.filter(candidate => requestedKeys.has(candidate.reminderKey))
}

export function selectPipelineReminderCandidatesForTrigger(candidates: PipelineReminderCandidate[], trigger: 'manual' | 'scheduled') {
  return trigger === 'scheduled' ? candidates.filter(candidate => candidate.targetType !== 'lead') : candidates
}

export async function previewPipelineReminders(organizationId: string) {
  const plan = await loadReminderPlan(organizationId)
  return {
    automationEnabled: Boolean(process.env.PIPELINE_AUTOMATION_SECRET),
    generatedAt: new Date().toISOString(),
    candidates: plan.candidates.map((candidate) => {
      const message = buildPipelineReminderMessage(candidate)
      return {
        reminderKey: candidate.reminderKey,
        targetType: candidate.targetType,
        targetId: candidate.targetId,
        clientId: candidate.clientId,
        clientName: candidate.clientName,
        email: candidate.email,
        subject: message.subject,
        bodyText: message.text,
        number: candidate.number,
        dueDate: candidate.dueDate,
        milestone: candidate.milestone,
        urgency: candidate.urgency,
        balanceCents: candidate.balanceCents,
        currency: candidate.currency,
      }
    }),
    skipped: plan.skipped,
  }
}

type ProspectContactWriter = (input: {
  organizationId: string
  clientId: number
  expectedFollowUpDate: string
  contactedAt: string
}) => Promise<boolean>

type ProspectContactAuditWriter = (input: Parameters<typeof logAudit>[0]) => Promise<void>

async function updateProspectLastContacted(input: Parameters<ProspectContactWriter>[0]) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('clients')
    .update({ last_contacted_at: input.contactedAt, next_follow_up_at: null })
    .eq('organization_id', input.organizationId)
    .eq('id', input.clientId)
    .eq('status', 'lead')
    .eq('next_follow_up_at', input.expectedFollowUpDate)
    .select('id')
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return Boolean(data)
}

export async function recordProspectReminderSuccess(input: {
  organizationId: string
  actorUserId?: string | null
  candidate: PipelineReminderCandidate
  contactedAt?: string
}, dependencies: {
  updateContact?: ProspectContactWriter
  writeAudit?: ProspectContactAuditWriter
} = {}) {
  if (input.candidate.targetType !== 'lead') return
  const contactedAt = input.contactedAt || new Date().toISOString()
  const updated = await (dependencies.updateContact || updateProspectLastContacted)({
    organizationId: input.organizationId,
    clientId: input.candidate.clientId,
    expectedFollowUpDate: input.candidate.dueDate,
    contactedAt,
  })
  if (!updated) throw createError({ statusCode: 409, message: 'Le prospect a changé depuis la prévisualisation.' })

  await (dependencies.writeAudit || logAudit)({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId || null,
    action: 'prospect.follow_up_contacted',
    entityType: 'client',
    entityId: input.candidate.clientId,
    clientId: input.candidate.clientId,
    payload: {
      source: 'pipeline_reminder_email',
      reminderKey: input.candidate.reminderKey,
      contactedAt,
    },
  })
}

export async function runPipelineReminders(input: {
  organizationId: string
  actorUserId?: string | null
  actorEmail?: string | null
  trigger: 'manual' | 'scheduled'
  reminderKeys?: string[]
  confirmedReminders?: PipelineReminderConfirmation[]
}) {
  const config = useRuntimeConfig()
  if (!isEmailConfigured(config)) throw createError({ statusCode: 503, message: 'Le service e-mail n’est pas configuré.' })

  const supabase = getSupabaseAdmin()
  const today = todayInZurich()
  let newlyOverdue: Array<{ id: number }> = []
  if (input.trigger === 'scheduled') {
    const { data, error: overdueError } = await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('organization_id', input.organizationId)
      .eq('status', 'sent')
      .lt('due_at', today)
      .select('id')
    if (overdueError) throw createError({ statusCode: 500, message: overdueError.message })
    newlyOverdue = data || []
  }

  const plan = await loadReminderPlan(input.organizationId)
  const confirmedByKey = new Map((input.confirmedReminders || []).map(item => [item.reminderKey, item]))
  const requestedKeys = input.confirmedReminders?.map(item => item.reminderKey) ?? input.reminderKeys
  const eligibleCandidates = selectPipelineReminderCandidatesForTrigger(plan.candidates, input.trigger)
  const candidates = selectPipelineReminderCandidates(eligibleCandidates, requestedKeys)
  if (input.trigger === 'manual') {
    if (!input.confirmedReminders || candidates.length !== confirmedByKey.size) {
      throw createError({ statusCode: 409, message: 'La prévisualisation a changé. Vérifie de nouveau les relances.' })
    }
    for (const candidate of candidates) {
      const confirmation = confirmedByKey.get(candidate.reminderKey)
      if (!confirmation || !confirmationMatchesCandidate(candidate, confirmation)) {
        throw createError({ statusCode: 409, message: 'Un destinataire ou un message a changé. Vérifie de nouveau les relances.' })
      }
    }
  }
  let sentCount = 0
  let failedCount = 0
  let followUpUpdateFailedCount = 0

  for (const candidate of candidates) {
    const confirmation = input.trigger === 'manual' ? confirmedByKey.get(candidate.reminderKey) : null
    const email = confirmation
      ? buildConfirmedPipelineReminderMessage(confirmation)
      : buildPipelineReminderMessage(candidate)
    const contactedAt = candidate.targetType === 'lead' ? new Date().toISOString() : null
    try {
      await sendAppEmail({
        to: candidate.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
        idempotencyKey: `${input.organizationId}:${candidate.reminderKey}`,
        tags: [{ name: 'category', value: 'pipeline_reminder' }],
      })
    }
    catch {
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
        contactedAt,
      },
    })
    if (candidate.targetType === 'lead') {
      try {
        await recordProspectReminderSuccess({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId || null,
          candidate,
          contactedAt: contactedAt || undefined,
        })
      }
      catch (error) {
        followUpUpdateFailedCount += 1
        console.error('[pipeline-reminders] prospect contact update failed', error)
      }
    }
  }

  const skippedCount = plan.skipped.alreadySent + plan.skipped.missingContact + plan.skipped.outsideMilestone + plan.skipped.paused
  const result = {
    sentCount,
    failedCount,
    followUpUpdateFailedCount,
    skippedCount,
    candidateCount: candidates.length,
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
