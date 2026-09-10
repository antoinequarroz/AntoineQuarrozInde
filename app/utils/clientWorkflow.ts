import type { Client, Invoice, Project, Quote, Task } from '~/types'

export const CLIENT_WORKFLOW_STAGES = [
  { id: 'contact', label: 'Contact', tone: 'bg-amber-500' },
  { id: 'quote', label: 'Devis', tone: 'bg-fuchsia-500' },
  { id: 'project', label: 'Projet', tone: 'bg-violet-500' },
  { id: 'invoice', label: 'Facture', tone: 'bg-sky-500' },
  { id: 'paid', label: 'Payé', tone: 'bg-emerald-500' },
] as const

export type ClientWorkflowStage = typeof CLIENT_WORKFLOW_STAGES[number]['id']

type WorkflowInput = {
  client: Client
  projects: Project[]
  quotes: Quote[]
  invoices: Invoice[]
  tasks?: Task[]
  today?: string
}

export function resolveClientWorkflow({ client, projects, quotes, invoices, tasks = [], today = new Date().toISOString().slice(0, 10) }: WorkflowInput) {
  const openTasks = tasks
    .filter(task => task.status !== 'done')
    .slice()
    .sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')))
  const activeQuote = quotes.find(quote => quote.status === 'sent')
    || quotes.find(quote => quote.status === 'draft')
    || quotes.find(quote => quote.status === 'accepted')
  const acceptedQuote = quotes.find(quote => quote.status === 'accepted')
  const openInvoice = invoices.find(invoice => invoice.documentType === 'invoice' && invoice.status === 'overdue')
    || invoices.find(invoice => invoice.documentType === 'invoice' && invoice.status === 'sent')
    || invoices.find(invoice => invoice.documentType === 'invoice' && invoice.status === 'draft')
  const payableInvoices = invoices.filter(invoice => invoice.documentType === 'invoice' && invoice.status !== 'cancelled')
  const allPaid = payableInvoices.length > 0 && payableInvoices.every(invoice => invoice.status === 'paid')

  let stage: ClientWorkflowStage = 'contact'
  let action = client.status === 'lead' ? 'Qualifier le besoin' : 'Créer le premier devis'
  let to = `/admin/quotes?new=1&clientId=${client.id}`
  let dueDate: string | null = openTasks[0]?.dueDate || null

  if (activeQuote) {
    stage = 'quote'
    action = activeQuote.status === 'draft'
      ? `Finaliser et envoyer ${activeQuote.number}`
      : activeQuote.status === 'sent'
        ? `Suivre ${activeQuote.number}`
        : 'Créer le projet accepté'
    to = activeQuote.status === 'accepted' && !projects.length
      ? `/admin/projects?new=1&clientId=${client.id}`
      : `/admin/quotes?quoteId=${activeQuote.id}&clientId=${client.id}`
    dueDate = activeQuote.validUntil || dueDate
  }

  if (projects.length && acceptedQuote) {
    const project = projects[0]!
    stage = 'project'
    action = openTasks[0]?.title || 'Continuer le projet'
    to = `/admin/projects/${project.id}`
  }

  if (projects.length && !quotes.length) {
    const project = projects[0]!
    stage = 'project'
    action = openTasks[0]?.title || 'Continuer le projet'
    to = `/admin/projects/${project.id}`
  }

  if (openInvoice) {
    stage = 'invoice'
    const overdue = openInvoice.status === 'overdue' || Boolean(openInvoice.dueAt && openInvoice.dueAt < today)
    action = overdue ? `Relancer ${openInvoice.number}` : openInvoice.status === 'draft' ? `Finaliser ${openInvoice.number}` : `Suivre ${openInvoice.number}`
    to = `/admin/invoices?invoiceId=${openInvoice.id}&clientId=${client.id}`
    dueDate = openInvoice.dueAt || dueDate
  } else if (allPaid) {
    stage = 'paid'
    action = 'Planifier le suivi client'
    to = `/admin/appointments?new=1&clientId=${client.id}`
    dueDate = payableInvoices.find(invoice => invoice.paidAt)?.paidAt || dueDate
  }

  const stageIndex = CLIENT_WORKFLOW_STAGES.findIndex(item => item.id === stage)
  return { stage, stageIndex, action, to, dueDate }
}
