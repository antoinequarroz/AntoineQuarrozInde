import type { ContactMessage } from '~/types'

export type MessageStatusFilter = 'all' | ContactMessage['status']

export function parseMessageStatusFilter(value: unknown): MessageStatusFilter {
  return value === 'new' || value === 'in_progress' || value === 'replied' || value === 'archived'
    ? value
    : 'all'
}

export function isNewMessage(message: Pick<ContactMessage, 'status'>): boolean {
  return message.status === 'new'
}

export function matchesMessageStatusFilter(message: Pick<ContactMessage, 'status'>, filter: MessageStatusFilter): boolean {
  return filter === 'all' || (filter === 'new' ? isNewMessage(message) : message.status === filter)
}
