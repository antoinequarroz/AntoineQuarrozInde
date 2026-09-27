import { describe, expect, it } from 'vitest'
import { linkifyReviewText } from '../app/utils/reviewLinks'

describe('testimonial links', () => {
  it('turns full and www URLs into safe clickable segments', () => {
    expect(linkifyReviewText('Voir www.physiobaur.ch ou https://example.com/projet.')).toEqual([
      { type: 'text', text: 'Voir ' },
      { type: 'link', text: 'www.physiobaur.ch', href: 'https://www.physiobaur.ch' },
      { type: 'text', text: ' ou ' },
      { type: 'link', text: 'https://example.com/projet', href: 'https://example.com/projet' },
      { type: 'text', text: '.' },
    ])
  })

  it('keeps plain testimonial copy unchanged', () => {
    expect(linkifyReviewText('Un accompagnement clair.')).toEqual([
      { type: 'text', text: 'Un accompagnement clair.' },
    ])
  })
})
