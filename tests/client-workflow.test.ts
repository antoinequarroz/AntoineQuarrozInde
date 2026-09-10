import { describe, expect, it } from 'vitest'
import { CLIENT_WORKFLOW_STAGES, resolveClientWorkflow } from '../app/utils/clientWorkflow'
import type { Client, Invoice, Project, Quote } from '../app/types'

const client = { id: 12, name: 'Atelier', status: 'lead' } as Client
const project = { id: 31, clientId: 12, title: 'Refonte' } as Project
const quote = { id: 22, clientId: 12, number: 'D-22', status: 'sent', validUntil: '2026-09-20' } as Quote
const invoice = { id: 44, clientId: 12, number: 'F-44', status: 'overdue', documentType: 'invoice', dueAt: '2026-09-08' } as Invoice

describe('client workflow', () => {
  it('uses one ordered lifecycle everywhere', () => {
    expect(CLIENT_WORKFLOW_STAGES.map(stage => stage.id)).toEqual(['contact', 'quote', 'project', 'invoice', 'paid'])
  })

  it('deep-links the next action to the exact commercial document', () => {
    expect(resolveClientWorkflow({ client, projects: [], quotes: [quote], invoices: [], today: '2026-09-10' })).toMatchObject({
      stage: 'quote',
      to: '/admin/quotes?quoteId=22&clientId=12',
    })
    expect(resolveClientWorkflow({ client, projects: [project], quotes: [quote], invoices: [invoice], today: '2026-09-10' })).toMatchObject({
      stage: 'invoice',
      action: 'Relancer F-44',
      to: '/admin/invoices?invoiceId=44&clientId=12',
    })
  })

  it('keeps an imported project reachable even without a quote', () => {
    expect(resolveClientWorkflow({ client, projects: [project], quotes: [], invoices: [] })).toMatchObject({
      stage: 'project',
      to: '/admin/projects/31',
    })
  })
})
