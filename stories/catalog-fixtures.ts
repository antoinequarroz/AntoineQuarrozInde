import type { Project, Client } from '../app/types'
import type { SocialPost } from '../shared/types/socialEditorial'
export const demoProjects: Project[] = (['web', 'mobile', 'cms'] as const).map((category, i) => ({
  id: 9001 + i, clientId: 9001 + i, title: ['Atelier Démo', 'Application Démo', 'Journal Démo'][i]!, slug: `projet-demo-${i}`, category,
  tags: ['Vue', 'Nuxt', 'Design'], description: 'Projet fictif pour examiner la présentation, la navigation et les contenus du portfolio.', descriptionEn: 'Fictional project for the interface catalogue.', descriptionDe: 'Fiktives Projekt für den UI-Katalog.',
  image: '/demo-project.svg', liveUrl: null, codeUrl: null, featured: i === 0, portfolioVisible: true, caseStudyPublished: false, caseStudyApprovedAt: null, caseStudyApprovedBy: null, clientLabel: 'Entreprise fictive', clientDisclosureStatus: 'anonymous',
  projectRole: 'Design et développement', projectDuration: 'Exemple', caseStudyTimelineApproved: false, completedAt: null, challenge: null, projectScope: null, keyDecisions: null, approach: null, solution: null, outcome: null, outcomeApproved: false, caseStudyLinksApproved: false, relatedServicePaths: [], deliverables: [], galleryImages: [], results: [], seoTitle: null, seoDescription: null, workflowStatus: 'active', createdAt: '2026-09-01T12:00:00Z',
}))
export const demoClients: Client[] = ['Atelier Démo', 'Studio Exemple', 'Association Démo'].map((name, i) => ({
  id: 9001 + i, name, company: name, email: `demo${i}@example.invalid`, phone: null, status: i === 2 ? 'active' : 'lead', notes: 'Contact fictif du catalogue.', billingStreet: null, billingBuilding: null, billingPostalCode: null, billingCity: null, billingCountry: 'CH', acquisitionSource: 'demo', acquisitionMedium: null, acquisitionCampaign: null, nextFollowUpAt: null, followUpNote: null, lastContactedAt: null, createdAt: '2026-09-01T12:00:00Z',
}))
export const demoArticles = ['Préparer son projet web', 'Structurer une interface', 'Mesurer une expérience'].map((title, i) => ({ id: 9001 + i, title, slug: `article-demo-${i}`, excerpt: 'Un exemple fictif pour vérifier la carte et son aperçu.', coverImage: '/demo-project.svg', tags: ['Démonstration'], readTime: 4 + i, content: 'Contenu de démonstration. Aucun article client réel n’est utilisé dans ce catalogue.', createdAt: '2026-09-01T12:00:00Z' }))
export const demoReviews = [{ id: 9001, author: 'Camille Démo', avatar: null, rating: 5, content: 'Témoignage fictif pour vérifier la mise en page du composant.', role: 'Rôle de démonstration', company: 'Entreprise fictive' }]
export const demoCards = demoArticles.map(a => ({ ...a, description: a.excerpt, imageSrc: a.coverImage, tag: 'Démo', href: `/blog/${a.slug}` }))
export function caseStudyForm() { return { portfolioVisible: false, caseStudyPublished: false, caseStudyApprovedAt: '', caseStudyApprovalConfirmed: false, clientLabel: 'Entreprise fictive', clientDisclosureStatus: 'anonymous' as const, projectRole: 'Design et développement', projectDuration: '6 semaines', caseStudyTimelineApproved: false, completedAt: '', challenge: 'Besoin fictif décrit pour le catalogue.', projectScope: '', keyDecisions: '', approach: '', solution: '', outcome: '', outcomeApproved: false, caseStudyLinksApproved: false, relatedServicePaths: [] as string[], deliverables: '', galleryImages: [] as Array<string | null>, results: [], seoTitle: '', seoDescription: '' } }

/** Fictional editorial posts, one per network; nothing here is published. */
export function demoSocialPosts(): SocialPost[] {
  const base = { studioContentId: null, article_url: 'https://example.invalid/blog/article-demo-0', publication_mode: 'manual' as const, approved_version: null, media_images: [], media_kind: null, media_url: null, media_title: null, external_post_url: null, last_error: null, publish_after: null, published_at: null, version: 1, created_at: '2026-11-01T08:00:00Z', updated_at: '2026-11-01T08:00:00Z' }
  return [
    { ...base, id: 'demo-linkedin', platform: 'linkedin', article_title: 'Préparer son projet web', content: 'Publication fictive pour LinkedIn : trois questions à se poser avant de lancer un site.', status: 'draft', planned_at: '2026-11-04T07:30:00Z' },
    { ...base, id: 'demo-x', platform: 'x', article_title: 'Structurer une interface', content: 'Publication fictive pour X, courte et sans lien réel.', status: 'approved', approved_version: 1, planned_at: '2026-11-05T11:00:00Z' },
    { ...base, id: 'demo-instagram', platform: 'instagram', article_title: 'Mesurer une expérience', content: 'Légende fictive pour Instagram.', status: 'published', planned_at: '2026-11-03T16:00:00Z', published_at: '2026-11-03T16:00:00Z', media_images: [{ url: '/demo-project.svg', alt: 'Visuel de démonstration' }] },
  ]
}
