export interface Project {
  id: number
  clientId: number | null
  title: string
  slug: string
  category: 'web' | 'mobile' | 'cms'
  tags: string[]
  description: string
  image: string | null
  liveUrl: string | null
  codeUrl: string | null
  featured: boolean
  caseStudyPublished: boolean
  clientLabel: string | null
  projectRole: string | null
  projectDuration: string | null
  completedAt: string | null
  challenge: string | null
  approach: string | null
  solution: string | null
  outcome: string | null
  deliverables: string[]
  galleryImages: string[]
  results: ProjectResult[]
  seoTitle: string | null
  seoDescription: string | null
  createdAt: string
}

export interface ProjectResult {
  value: string
  label: string
}

export interface ContactForm {
  name: string
  email: string
  subject: string
  message: string
}

export interface ContactMessage {
  id: number
  name: string
  email: string
  subject: string | null
  message: string
  status: 'new' | 'in_progress' | 'replied' | 'archived'
  tags: string[]
  repliedAt: string | null
  createdAt: string
}

export interface Client {
  id: number
  name: string
  company: string | null
  email: string
  phone: string | null
  status: 'lead' | 'active' | 'inactive'
  notes: string | null
  billingStreet: string | null
  billingBuilding: string | null
  billingPostalCode: string | null
  billingCity: string | null
  billingCountry: string
  acquisitionSource: string | null
  acquisitionMedium: string | null
  acquisitionCampaign: string | null
  createdAt: string
}

export interface Task {
  id: number
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate: string | null
  clientId: number | null
  projectId: number | null
  createdAt: string
}

export interface Quote {
  id: number
  number: string
  clientId: number | null
  title: string
  amountCents: number
  currency: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  issuedAt: string | null
  validUntil: string | null
  notes: string | null
  subtotalCents?: number
  taxCents?: number
  totalCents?: number
  items?: QuoteItem[]
  createdAt: string
}

export interface Invoice {
  id: number
  number: string
  clientId: number | null
  quoteId: number | null
  amountCents: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issuedAt: string | null
  dueAt: string | null
  paidAt: string | null
  notes: string | null
  documentType: 'invoice' | 'credit_note'
  creditedInvoiceId: number | null
  lockedAt: string | null
  paymentReferenceType: 'NON' | 'SCOR' | 'QRR'
  paymentReference: string | null
  subtotalCents?: number
  taxCents?: number
  totalCents?: number
  items?: InvoiceItem[]
  payments?: InvoicePayment[]
  paidAmountCents: number
  createdAt: string
}

export interface InvoicePayment {
  id: number
  invoiceId: number
  amountCents: number
  currency: string
  method: 'bank_transfer' | 'swiss_qr' | 'twint' | 'cash' | 'other'
  paidAt: string
  reference: string | null
  notes: string | null
  provider: 'stripe' | null
  providerPaymentId: string | null
  voidedAt: string | null
  voidReason: string | null
  createdAt: string
}

export interface QuoteItem {
  id?: number
  label: string
  description: string | null
  quantity: number
  unitPriceCents: number
  taxRate: number
  totalCents?: number
}

export interface InvoiceItem {
  id?: number
  label: string
  description: string | null
  quantity: number
  unitPriceCents: number
  taxRate: number
  totalCents?: number
}

export interface Appointment {
  id: number
  title: string
  description: string | null
  clientId: number | null
  startsAt: string
  endsAt: string
  location: string | null
  meetingUrl: string | null
  status: 'scheduled' | 'completed' | 'cancelled'
  createdAt: string
}

export type ServiceKey = 'vitrine' | 'mobile' | 'cms'

export type Locale = 'fr' | 'en' | 'de'
