import {
  cloneDefaultTechnologyStack,
  parseTechnologyStackItems,
  TechnologyStackValidationError,
  technologyStackOrDefault,
  type TechnologyStackItem,
} from '../../shared/utils/technologyStack'

export const TECHNOLOGY_STACK_COLUMNS = [
  'draft_items',
  'published_items',
  'draft_revision',
  'published_revision',
  'updated_at',
  'published_at',
].join(',')

export type TechnologyStackRow = {
  draft_items: unknown
  published_items: unknown
  draft_revision: number
  published_revision: number
  updated_at: string
  published_at: string
}

export function requireTechnologyStackEditor(org: { role?: string | null }) {
  if (!['owner', 'admin'].includes(String(org.role ?? ''))) {
    throw createError({ statusCode: 403, message: 'Seuls les propriétaires et administrateurs peuvent modifier la stack.' })
  }
}

export function parseTechnologyStackRequest(value: unknown): TechnologyStackItem[] {
  try {
    return parseTechnologyStackItems(value)
  }
  catch (error) {
    if (error instanceof TechnologyStackValidationError) {
      throw createError({ statusCode: 400, message: error.message })
    }
    throw error
  }
}

export function parseExpectedRevision(value: unknown, field = 'expectedRevision') {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw createError({ statusCode: 400, message: `${field} est invalide.` })
  }
  return Number(value)
}

export function serializeTechnologyStackSettings(row: TechnologyStackRow | null) {
  if (!row) {
    const initial = cloneDefaultTechnologyStack()
    return {
      draftItems: initial,
      publishedItems: cloneDefaultTechnologyStack(),
      draftRevision: 0,
      publishedRevision: 0,
      updatedAt: null,
      publishedAt: null,
    }
  }

  return {
    draftItems: parseTechnologyStackItems(row.draft_items),
    publishedItems: parseTechnologyStackItems(row.published_items),
    draftRevision: row.draft_revision,
    publishedRevision: row.published_revision,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  }
}

export function serializePublicTechnologyStack(value: unknown) {
  return { items: technologyStackOrDefault(value) }
}
