export interface Project {
  id: number
  title: string
  slug: string
  category: 'web' | 'mobile' | 'cms'
  tags: string[]
  description: string
  image: string | null
  liveUrl: string | null
  codeUrl: string | null
  featured: boolean
  createdAt: string
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
  status: 'new' | 'replied'
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
  createdAt: string
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
