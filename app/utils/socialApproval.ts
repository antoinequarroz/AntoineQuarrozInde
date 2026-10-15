export type SocialApprovalMode = 'scheduled' | 'now' | 'text' | 'media'

// The user's chosen action determines the endpoint. Instagram images follow
// the same explicit publication flow as LinkedIn/X; only text review is manual.
export function socialApprovalRequest(mode: SocialApprovalMode) {
  switch (mode) {
    case 'text': return { action: 'review-instagram', confirmation: 'VALIDER_TEXTE_INSTAGRAM' }
    case 'media': return { action: 'review-media', confirmation: 'VALIDER_TEXTE_ET_VISUELS' }
    case 'now': return { action: 'approve', confirmation: 'PUBLIER_MAINTENANT' }
    case 'scheduled': return { action: 'approve', confirmation: 'PROGRAMMER_POUR_18H' }
  }
}
