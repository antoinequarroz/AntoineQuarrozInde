import type { Client } from '~/types'

export type CrmProspectSort = 'priority' | 'follow_up' | 'recent' | 'name'

export const PIPELINE_PREVIEW_LIMIT = 6

export function extractLeadScore(notes: string | null): number | null {
  const match = notes?.match(/score\s*[:=]?\s*(\d{1,3})/i)
  if (!match) return null
  return Math.min(Number(match[1]), 100)
}

function stableClientOrder(a: Client, b: Client) {
  return a.name.localeCompare(b.name, 'fr-CH', { sensitivity: 'base' }) || a.id - b.id
}

function followUpRank(client: Client, today: string) {
  if (!client.nextFollowUpAt) return 3
  if (client.nextFollowUpAt < today) return 0
  if (client.nextFollowUpAt === today) return 1
  return 2
}

function priorityRank(client: Client, today: string) {
  if (!client.nextFollowUpAt || client.nextFollowUpAt > today) return 2
  return client.nextFollowUpAt < today ? 0 : 1
}

export function sortCrmProspects(clients: Client[], mode: CrmProspectSort, today: string): Client[] {
  return clients
    .filter(client => client.status === 'lead')
    .slice()
    .sort((a, b) => {
      if (mode === 'name') return stableClientOrder(a, b)
      if (mode === 'recent') return b.createdAt.localeCompare(a.createdAt) || stableClientOrder(a, b)
      if (mode === 'follow_up') {
        const rank = followUpRank(a, today) - followUpRank(b, today)
        const date = String(a.nextFollowUpAt || '9999').localeCompare(String(b.nextFollowUpAt || '9999'))
        return rank || date || stableClientOrder(a, b)
      }

      const rank = priorityRank(a, today) - priorityRank(b, today)
      const score = (extractLeadScore(b.notes) ?? -1) - (extractLeadScore(a.notes) ?? -1)
      return rank || score || b.createdAt.localeCompare(a.createdAt) || stableClientOrder(a, b)
    })
}

export function visiblePipelineItems<T>(items: T[], expanded: boolean, limit = PIPELINE_PREVIEW_LIMIT): T[] {
  return expanded ? items : items.slice(0, limit)
}
