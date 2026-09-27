export type ReviewTextPart = {
  type: 'text' | 'link'
  text: string
  href?: string
}

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>]+/gi
const TRAILING_PUNCTUATION = /[),.!?;:]+$/

export function linkifyReviewText(value: string): ReviewTextPart[] {
  const parts: ReviewTextPart[] = []
  let cursor = 0

  for (const match of value.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0
    const raw = match[0]
    const trailing = raw.match(TRAILING_PUNCTUATION)?.[0] ?? ''
    const linkText = trailing ? raw.slice(0, -trailing.length) : raw

    if (start > cursor) parts.push({ type: 'text', text: value.slice(cursor, start) })
    parts.push({
      type: 'link',
      text: linkText,
      href: linkText.startsWith('www.') ? `https://${linkText}` : linkText,
    })
    if (trailing) parts.push({ type: 'text', text: trailing })
    cursor = start + raw.length
  }

  if (cursor < value.length) parts.push({ type: 'text', text: value.slice(cursor) })
  return parts.length ? parts : [{ type: 'text', text: value }]
}
