type MarkdownVariant = 'public' | 'compact'

const MARKDOWN_CLASSES = {
  public: {
    h1: 'font-display font-bold text-3xl mt-4 mb-6 text-gray-900 dark:text-white',
    h2: 'font-display font-bold text-2xl mt-8 mb-4 text-gray-900 dark:text-white',
    h3: 'font-display font-bold text-xl mt-6 mb-3 text-gray-900 dark:text-white',
    paragraph: 'mb-4 text-gray-600 dark:text-gray-300 leading-relaxed',
    strong: 'font-semibold text-gray-900 dark:text-white',
    code: 'px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-mono',
  },
  compact: {
    h1: 'font-bold text-xl mt-4 mb-4 text-gray-900 dark:text-white',
    h2: 'font-bold text-lg mt-6 mb-3 text-gray-900 dark:text-white',
    h3: 'font-bold text-base mt-5 mb-2 text-gray-900 dark:text-white',
    paragraph: 'mb-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed',
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

  const flushParagraph = () => {
    if (!paragraph.length) return
    output.push(`<p class="${classes.paragraph}">${paragraph.map(line => renderInlineMarkdown(line, variant)).join('<br>')}</p>`)
    paragraph = []
  }

  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim()) {
      flushParagraph()
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (!heading) {
      paragraph.push(line)
      continue
    }

    flushParagraph()
    const level = heading[1]!.length as 1 | 2 | 3
    const headingClass = classes[`h${level}`]
    output.push(`<h${level} class="${headingClass}">${renderInlineMarkdown(heading[2]!, variant)}</h${level}>`)
  }

  flushParagraph()
  return output.join('')
}
