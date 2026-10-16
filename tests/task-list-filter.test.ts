import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '../app/types'
import { isTaskDueToday, matchesTaskListFilter, parseTaskListFilter, taskBusinessDate } from '../app/utils/taskListFilter'

const task = (id: number, overrides: Partial<Task> = {}): Task => ({
  id, title: `Tâche ${id}`, description: null, status: 'todo', priority: 'medium',
  dueDate: '2026-10-16', clientId: null, projectId: null, createdAt: '2026-10-01', ...overrides,
})

describe('Task dashboard filters', () => {
  afterEach(() => vi.useRealTimers())

  it('includes open tasks due today or overdue and excludes done, future and undated tasks', () => {
    const documents = [
      task(1), task(2, { status: 'in_progress' }),
      task(3, { dueDate: '2026-10-15' }), task(4, { status: 'in_progress', dueDate: '2026-09-01' }),
      task(5, { status: 'done' }), task(6, { status: 'done', dueDate: '2026-09-01' }),
      task(7, { dueDate: '2026-10-17' }), task(8, { dueDate: null }),
    ]
    const visible = documents.filter(item => matchesTaskListFilter(item, 'due-today', '2026-10-16'))
    expect(visible.map(item => item.id)).toEqual([1, 2, 3, 4])
    expect(visible).toEqual(documents.filter(item => isTaskDueToday(item, '2026-10-16')))
    expect(documents.filter(item => matchesTaskListFilter(item, 'all', '2026-10-16'))).toEqual(documents)
  })

  it('preserves local temporary IDs and document fields while reflecting optimistic changes', () => {
    const pending = task(-2, { status: 'in_progress' })
    const documents = [pending, task(1, { dueDate: null })]
    const before = documents.map(item => ({ ...item }))
    expect(documents.filter(item => matchesTaskListFilter(item, 'due-today', '2026-10-16'))).toEqual([pending])
    expect(documents).toEqual(before)
    pending.status = 'done'
    expect(documents.filter(item => matchesTaskListFilter(item, 'due-today', '2026-10-16'))).toEqual([])
    pending.status = 'todo'
    pending.dueDate = '2026-10-17'
    expect(documents.filter(item => matchesTaskListFilter(item, 'due-today', '2026-10-16'))).toEqual([])
    expect(documents).toHaveLength(2)
  })

  it('uses the Swiss business date rather than the UTC date for the default cutoff', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-15T22:30:00Z'))
    expect(taskBusinessDate()).toBe('2026-10-16')
    expect(isTaskDueToday(task(1))).toBe(true)
    expect(matchesTaskListFilter(task(2, { dueDate: '2026-10-17' }), 'due-today')).toBe(false)
  })

  it('keeps the calendar date correct through both Swiss daylight-saving transitions', () => {
    expect(taskBusinessDate(new Date('2026-03-28T23:30:00Z'))).toBe('2026-03-29')
    expect(taskBusinessDate(new Date('2026-03-29T22:30:00Z'))).toBe('2026-03-30')
    expect(taskBusinessDate(new Date('2026-10-25T00:30:00Z'))).toBe('2026-10-25')
    expect(taskBusinessDate(new Date('2026-10-25T01:30:00Z'))).toBe('2026-10-25')
    expect(taskBusinessDate(new Date('2026-10-25T23:30:00Z'))).toBe('2026-10-26')
  })

  it('accepts the named URL filter and resets invalid or repeated parameters safely', () => {
    expect(parseTaskListFilter('all')).toBe('all')
    expect(parseTaskListFilter('due-today')).toBe('due-today')
    for (const value of [undefined, null, '', 'todo', 'unknown', ['due-today'], ['due-today', 'all']]) {
      expect(parseTaskListFilter(value)).toBe('all')
    }
  })
})
