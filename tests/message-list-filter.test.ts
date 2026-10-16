import { describe, expect, it } from 'vitest'
import type { ContactMessage } from '../app/types'
import { isNewMessage, matchesMessageStatusFilter, parseMessageStatusFilter } from '../app/utils/messageListFilter'

const message = (id: number, overrides: Partial<ContactMessage> = {}): ContactMessage => ({
  id, name: `Contact ${id}`, email: `contact${id}@example.invalid`, subject: 'Demande de démonstration',
  message: 'Contenu de démonstration', status: 'new', tags: [], repliedAt: null,
  createdAt: '2026-10-16T08:00:00Z', ...overrides,
})

describe('Message dashboard filters', () => {
  it('keeps every new message without truncating the dashboard population', () => {
    const documents = [
      message(1, { status: 'archived' }),
      ...Array.from({ length: 8 }, (_, index) => message(index + 2)),
      message(10, { status: 'in_progress' }), message(11, { status: 'replied' }),
    ]
    const visible = documents.filter(item => matchesMessageStatusFilter(item, 'new'))
    expect(visible.map(item => item.id)).toEqual([2, 3, 4, 5, 6, 7, 8, 9])
    expect(visible).toEqual(documents.filter(isNewMessage))
    expect(documents.filter(item => matchesMessageStatusFilter(item, 'all'))).toEqual(documents)
  })

  it('uses the saved status alone and does not mark a message as read while filtering', () => {
    const document = message(1, { repliedAt: '2026-10-15T10:00:00Z', tags: ['demonstration'] })
    const before = { ...document, tags: [...document.tags] }
    expect(isNewMessage(document)).toBe(true)
    expect(matchesMessageStatusFilter(document, 'new')).toBe(true)
    expect(document).toEqual(before)
  })

  it('preserves each general status filter and excludes the other saved statuses', () => {
    const documents = [message(1), message(2, { status: 'in_progress' }), message(3, { status: 'replied' }), message(4, { status: 'archived' })]
    for (const status of ['new', 'in_progress', 'replied', 'archived'] as const) {
      expect(documents.filter(item => matchesMessageStatusFilter(item, status))).toEqual(documents.filter(item => item.status === status))
    }
  })

  it('accepts known URL statuses and resets invalid or repeated parameters safely', () => {
    for (const status of ['all', 'new', 'in_progress', 'replied', 'archived'] as const) {
      expect(parseMessageStatusFilter(status)).toBe(status)
    }
    for (const value of [undefined, null, '', 'unread', 'unknown', ['new'], ['new', 'archived']]) {
      expect(parseMessageStatusFilter(value)).toBe('all')
    }
  })
})
