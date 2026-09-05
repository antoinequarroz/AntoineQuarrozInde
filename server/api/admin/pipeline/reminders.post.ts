import { runPipelineReminders } from '../../../utils/pipelineReminders'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body: { confirmedReminders?: unknown } = await readBody<{ confirmedReminders?: unknown }>(event).catch(() => ({}))
  if (!Array.isArray(body.confirmedReminders)) {
    throw createError({ statusCode: 400, message: 'Une sélection explicite de relances est obligatoire.' })
  }
  const confirmedReminders = body.confirmedReminders
    .filter((item: unknown): item is { reminderKey: string, email: string, subject: string, bodyText: string } => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Record<string, unknown>
      return typeof candidate.reminderKey === 'string' && candidate.reminderKey.length <= 160
        && typeof candidate.email === 'string' && candidate.email.length <= 320
        && typeof candidate.subject === 'string' && candidate.subject.length <= 300
        && typeof candidate.bodyText === 'string' && candidate.bodyText.length <= 20_000
    })
    .slice(0, 100)
  if (confirmedReminders.length !== body.confirmedReminders.length) {
    throw createError({ statusCode: 400, message: 'La sélection de relances est invalide.' })
  }
  return await runPipelineReminders({
    organizationId: org.id,
    actorUserId: user?.id || null,
    actorEmail: user?.email || null,
    trigger: 'manual',
    confirmedReminders,
  })
})
