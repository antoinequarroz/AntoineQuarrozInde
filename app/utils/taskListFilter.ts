import type { Task } from '../types'

export type TaskListFilter = 'all' | 'due-today'

export function taskBusinessDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

export function parseTaskListFilter(value: unknown): TaskListFilter {
  return value === 'due-today' ? 'due-today' : 'all'
}

/** Open tasks due today or earlier, including tasks already in progress. */
export function isTaskDueToday(task: Pick<Task, 'status' | 'dueDate'>, today = taskBusinessDate()): boolean {
  return task.status !== 'done' && Boolean(task.dueDate && task.dueDate <= today)
}

export function matchesTaskListFilter(task: Pick<Task, 'status' | 'dueDate'>, filter: TaskListFilter, today = taskBusinessDate()): boolean {
  return filter === 'all' || isTaskDueToday(task, today)
}
