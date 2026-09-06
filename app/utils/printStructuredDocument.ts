export interface PrintableField {
  label: string
  value: string
  multiline?: boolean
}

interface PrintableDocument {
  title: string
  heading: string
  fields: PrintableField[]
}

/**
 * Build a printable document exclusively with DOM text nodes. CRM values never
 * pass through an HTML parser, so stored content cannot inject markup or script.
 */
export function printStructuredDocument(options: PrintableDocument): boolean {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false

  printWindow.opener = null

  const document = printWindow.document
  document.documentElement.lang = 'fr'
  document.title = options.title

  const charset = document.createElement('meta')
  charset.setAttribute('charset', 'utf-8')
  document.head.append(charset)

  const viewport = document.createElement('meta')
  viewport.name = 'viewport'
  viewport.content = 'width=device-width, initial-scale=1'
  document.head.append(viewport)

  const styles = document.createElement('style')
  styles.textContent = `
    :root { color-scheme: light; }
    body { margin: 0; padding: 24px; color: #111827; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    main { max-width: 760px; margin: 0 auto; }
    h1 { margin: 0 0 20px; font-size: 28px; }
    dl { margin: 0; }
    .print-field { margin: 0 0 12px; }
    dt { display: inline; font-weight: 700; }
    dd { display: inline; margin: 0 0 0 6px; }
    .print-field--multiline dt, .print-field--multiline dd { display: block; margin-left: 0; }
    .print-field--multiline dd { margin-top: 4px; white-space: pre-wrap; }
  `
  document.head.append(styles)

  const main = document.createElement('main')
  const heading = document.createElement('h1')
  heading.textContent = options.heading
  main.append(heading)

  const list = document.createElement('dl')
  for (const field of options.fields) {
    const wrapper = document.createElement('div')
    wrapper.className = field.multiline ? 'print-field print-field--multiline' : 'print-field'

    const term = document.createElement('dt')
    term.textContent = `${field.label} :`
    const description = document.createElement('dd')
    description.textContent = field.value

    wrapper.append(term, description)
    list.append(wrapper)
  }
  main.append(list)
  document.body.replaceChildren(main)

  printWindow.focus()
  printWindow.requestAnimationFrame(() => printWindow.print())
  return true
}
