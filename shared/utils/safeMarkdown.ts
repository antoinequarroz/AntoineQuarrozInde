type MarkdownVariant = 'public' | 'compact'

const MARKDOWN_CLASSES = {
  public: {
    h1: 'font-display font-bold text-3xl mt-4 mb-6 text-gray-900 dark:text-white',
    h2: 'font-display font-bold text-2xl mt-8 mb-4 text-gray-900 dark:text-white',
    h3: 'font-display font-bold text-xl mt-6 mb-3 text-gray-900 dark:text-white',
    paragraph: 'mb-4 text-gray-600 dark:text-gray-300 leading-relaxed',
    list: 'mb-5 ml-6 space-y-2 text-gray-600 dark:text-gray-300 leading-relaxed',
    tableWrapper: 'mb-6 overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-white/10',
    table: 'w-full border-collapse text-left text-sm',
    tableHead: 'bg-gray-50 text-gray-900 dark:bg-white/5 dark:text-white',
    tableHeader: 'border-b border-gray-200 px-4 py-3 font-semibold dark:border-white/10',
    tableCell: 'border-b border-gray-100 px-4 py-3 align-top text-gray-600 last:border-b-0 dark:border-white/5 dark:text-gray-300',
    strong: 'font-semibold text-gray-900 dark:text-white',
    code: 'px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-mono',
  },
  compact: {
    h1: 'font-bold text-xl mt-4 mb-4 text-gray-900 dark:text-white',
    h2: 'font-bold text-lg mt-6 mb-3 text-gray-900 dark:text-white',
    h3: 'font-bold text-base mt-5 mb-2 text-gray-900 dark:text-white',
    paragraph: 'mb-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed',
    list: 'mb-4 ml-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed',
    tableWrapper: 'mb-4 overflow-x-auto rounded-xl border border-gray-200/80 dark:border-white/10',
    table: 'w-full border-collapse text-left text-xs',
    tableHead: 'bg-gray-50 text-gray-900 dark:bg-white/5 dark:text-white',
    tableHeader: 'border-b border-gray-200 px-3 py-2 font-semibold dark:border-white/10',
    tableCell: 'border-b border-gray-100 px-3 py-2 align-top text-gray-600 last:border-b-0 dark:border-white/5 dark:text-gray-300',
    strong: 'font-semibold text-gray-900 dark:text-white',
    code: 'px-1 py-0.5 rounded bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-mono',
  },
} as const

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] || character)
}

function renderInlineMarkdown(value: string, variant: MarkdownVariant): string {
  const classes = MARKDOWN_CLASSES[variant]
  const tokens = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g
  let cursor = 0
  let html = ''

  for (const match of value.matchAll(tokens)) {
    const index = match.index ?? 0
    const token = match[0]
    html += escapeHtml(value.slice(cursor, index))

    if (token.startsWith('`')) {
      html += `<code class="${classes.code}">${escapeHtml(token.slice(1, -1))}</code>`
    }
    else if (token.startsWith('**')) {
      html += `<strong class="${classes.strong}">${escapeHtml(token.slice(2, -2))}</strong>`
    }
    else {
      html += `<em>${escapeHtml(token.slice(1, -1))}</em>`
    }

    cursor = index + token.length
  }

  return html + escapeHtml(value.slice(cursor))
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map(cell => cell.trim())
}

function isTableSeparator(line: string, expectedColumns: number): boolean {
  const cells = parseTableRow(line)
  return cells.length === expectedColumns && cells.every(cell => /^:?-{3,}:?$/.test(cell))
}

/**
 * Render the small Markdown subset supported by the article editor.
 *
 * User text is escaped before it reaches any generated HTML element. Raw HTML,
 * event handlers and URL-bearing Markdown are deliberately unsupported, which
 * keeps the result safe for SSR and Vue's `v-html` sink without a browser-only
 * sanitizer.
 */
export function renderSafeMarkdown(markdown: string, variant: MarkdownVariant = 'public'): string {
  if (!markdown.trim()) return ''

  const classes = MARKDOWN_CLASSES[variant]
  const output: string[] = []
  let paragraph: string[] = []
  let list: { ordered: boolean, items: string[] } | null = null

  const flushParagraph = () => {
    if (!paragraph.length) return
    output.push(`<p class="${classes.paragraph}">${paragraph.map(line => renderInlineMarkdown(line, variant)).join('<br>')}</p>`)
    paragraph = []
  }

  const flushList = () => {
    if (!list) return
    const tag = list.ordered ? 'ol' : 'ul'
    const markerClass = list.ordered ? 'list-decimal' : 'list-disc'
    output.push(`<${tag} class="${classes.list} ${markerClass}">${list.items.map(item => `<li>${renderInlineMarkdown(item, variant)}</li>`).join('')}</${tag}>`)
    list = null
  }

  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }

    const tableHeaders = line.includes('|') ? parseTableRow(line) : []
    const nextLine = lines[index + 1]
    if (tableHeaders.length > 1 && nextLine && isTableSeparator(nextLine, tableHeaders.length)) {
      flushParagraph()
      flushList()
      const rows: string[][] = []
      index += 2
      while (index < lines.length) {
        const candidate = lines[index]!
        if (!candidate.trim() || !candidate.includes('|')) break
        const cells = parseTableRow(candidate)
        if (cells.length !== tableHeaders.length) break
        rows.push(cells)
        index++
      }
      index--
      const head = tableHeaders.map(cell => `<th class="${classes.tableHeader}">${renderInlineMarkdown(cell, variant)}</th>`).join('')
      const body = rows.map(row => `<tr>${row.map(cell => `<td class="${classes.tableCell}">${renderInlineMarkdown(cell, variant)}</td>`).join('')}</tr>`).join('')
      output.push(`<div class="${classes.tableWrapper}"><table class="${classes.table}"><thead class="${classes.tableHead}"><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`)
      continue
    }

    const listItem = line.match(/^\s*(?:(-)|(?:\d+\.))\s+(.+)$/)
    if (listItem) {
      flushParagraph()
      const ordered = !listItem[1]
      if (list && list.ordered !== ordered) flushList()
      list ??= { ordered, items: [] }
      list.items.push(listItem[2]!)
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (!heading) {
      flushList()
      paragraph.push(line)
      continue
    }

    flushParagraph()
    flushList()
    const level = heading[1]!.length as 1 | 2 | 3
    const headingClass = classes[`h${level}`]
    output.push(`<h${level} class="${headingClass}">${renderInlineMarkdown(heading[2]!, variant)}</h${level}>`)
  }

  flushParagraph()
  flushList()
  return output.join('')
}
