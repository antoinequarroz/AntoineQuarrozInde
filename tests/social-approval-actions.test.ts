import { expect, it } from 'vitest'
import { socialApprovalRequest } from '../app/utils/socialApproval'
it('sends Instagram image publication to automatic approval, just like other networks', () => {
  expect(socialApprovalRequest('now')).toEqual({ action: 'approve', confirmation: 'PUBLIER_MAINTENANT' })
  expect(socialApprovalRequest('scheduled')).toEqual({ action: 'approve', confirmation: 'PROGRAMMER_POUR_18H' })
})
it('keeps text-only Instagram and legacy media reviews separate from public authorization', () => {
  expect(socialApprovalRequest('text')).toEqual({ action: 'review-instagram', confirmation: 'VALIDER_TEXTE_INSTAGRAM' })
  expect(socialApprovalRequest('media')).toEqual({ action: 'review-media', confirmation: 'VALIDER_TEXTE_ET_VISUELS' })
})
