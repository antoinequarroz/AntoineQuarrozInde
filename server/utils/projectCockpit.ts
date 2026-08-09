export const cockpitTables = {
  milestone: 'project_milestones',
  time: 'project_time_entries',
  note: 'project_notes',
  deliverable: 'project_deliverables',
} as const

export type CockpitKind = keyof typeof cockpitTables

export function cockpitKind(value: unknown): CockpitKind {
  const kind = String(value || '') as CockpitKind
  if (!(kind in cockpitTables)) throw createError({ statusCode: 400, message: 'Type de donnée projet invalide.' })
  return kind
}

function text(value: unknown, field: string, max: number, optional = false) {
  const result = String(value || '').trim()
  if (!result && !optional) throw createError({ statusCode: 400, message: `${field} est requis.` })
  if (result.length > max) throw createError({ statusCode: 400, message: `${field} est trop long.` })
  return result || null
}

function date(value: unknown, optional = true) {
  const result = String(value || '').trim()
  if (!result && optional) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw createError({ statusCode: 400, message: 'Date invalide.' })
  return result
}

export function cockpitPayload(kind: CockpitKind, body: Record<string, unknown>) {
  if (kind === 'milestone') {
    const status = String(body.status || 'planned')
    if (!['planned', 'in_progress', 'done', 'blocked'].includes(status)) throw createError({ statusCode: 400, message: 'Statut de jalon invalide.' })
    return { title: text(body.title, 'Titre', 180), due_at: date(body.dueAt), status }
  }
  if (kind === 'time') {
    const minutes = Number(body.minutes)
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) throw createError({ statusCode: 400, message: 'Durée invalide.' })
    return { description: text(body.description, 'Description', 500), minutes, worked_at: date(body.workedAt, false), task_id: body.taskId ? Number(body.taskId) : null }
  }
  if (kind === 'note') {
    const noteKind = String(body.noteKind || 'note')
    if (!['note', 'meeting'].includes(noteKind)) throw createError({ statusCode: 400, message: 'Type de note invalide.' })
    return { title: text(body.title, 'Titre', 180), content: text(body.content, 'Contenu', 10_000), kind: noteKind, occurred_at: body.occurredAt || new Date().toISOString(), client_visible: Boolean(body.clientVisible) }
  }
  const status = String(body.status || 'draft')
  if (!['draft', 'ready', 'delivered', 'approved'].includes(status)) throw createError({ statusCode: 400, message: 'Statut de livrable invalide.' })
  const rawUrl = text(body.url, 'URL', 2000, true)
  let url: string | null = null
  if (rawUrl) {
    try { const parsed = new URL(rawUrl); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); url = parsed.toString() }
    catch { throw createError({ statusCode: 400, message: 'URL de livrable invalide.' }) }
  }
  return { title: text(body.title, 'Titre', 180), url, status, client_visible: Boolean(body.clientVisible) }
}
