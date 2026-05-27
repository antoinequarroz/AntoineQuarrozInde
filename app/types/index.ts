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

export type ServiceKey = 'vitrine' | 'mobile' | 'cms'

export type Locale = 'fr' | 'en' | 'de'
