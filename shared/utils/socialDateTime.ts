const zurichFormatter = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', {
  timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', era: 'short',
})

type DateParts = { year: number, month: number, day: number, hour: number, minute: number, second: number }

function utcMilliseconds(parts: DateParts): number {
  const date = new Date(0)
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day)
  date.setUTCHours(parts.hour, parts.minute, parts.second, 0)
  return date.getTime()
}

function zurichParts(date: Date): DateParts | null {
  if (!Number.isFinite(date.getTime())) return null
  const parts = zurichFormatter.formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || ''
  const year = Number(value('year'))
  return {
    year: value('era') === 'BC' ? 1 - year : year,
    month: Number(value('month')), day: Number(value('day')),
    hour: Number(value('hour')), minute: Number(value('minute')), second: Number(value('second')),
  }
}

export function isSocialDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || value.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day || month > 12 || day > 31) return false
  const date = new Date(utcMilliseconds({ year, month, day, hour: 0, minute: 0, second: 0 }))
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
}

function absoluteDate(value: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match || match[0] !== value || !isSocialDateKey(match[1]) || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4] || 0) > 59) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function dateKey(parts: DateParts): string {
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

/** Formats an absolute instant for a datetime-local input, always in Zurich. */
export function isoToZurichLocal(iso: string | null): string {
  if (typeof iso !== 'string') return ''
  const date = absoluteDate(iso)
  const parts = date && zurichParts(date)
  if (!parts) return ''
  const key = dateKey(parts)
  return isSocialDateKey(key) ? `${key}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}` : ''
}

export function zurichDateKey(iso: string): string {
  return isoToZurichLocal(iso).slice(0, 10)
}

/** Rejects invalid, skipped and repeated local minutes instead of guessing an offset. */
export function zurichLocalToIso(value: string): string | null {
  if (typeof value !== 'string' || value.length !== 16) return null
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match || !isSocialDateKey(match[1]) || Number(match[2]) > 23 || Number(match[3]) > 59) return null
  const [year, month, day] = match[1]!.split('-').map(Number)
  const local: DateParts = { year: year!, month: month!, day: day!, hour: Number(match[2]), minute: Number(match[3]), second: 0 }
  const nominal = utcMilliseconds(local)
  const offsets = new Set<number>()
  // Both sides of a clock change are sampled; all matching candidates are checked.
  for (const days of [-2, -1, 0, 1, 2]) {
    const sample = nominal + days * 86_400_000
    const parts = zurichParts(new Date(sample))
    if (parts) offsets.add(utcMilliseconds(parts) - sample)
  }
  const matches = [...offsets].map(offset => nominal - offset).filter(candidate => {
    const parts = zurichParts(new Date(candidate))
    return parts && parts.year === local.year && parts.month === local.month && parts.day === local.day
      && parts.hour === local.hour && parts.minute === local.minute && parts.second === 0
  })
  return matches.length === 1 ? new Date(matches[0]!).toISOString() : null
}
