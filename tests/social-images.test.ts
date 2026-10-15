import { describe, it, expect, vi } from 'vitest'
import { validateSocialImages, requireAutomaticSocialMedia } from '../server/utils/socialImages'
vi.stubGlobal('createError', (value: { message: string }) => new Error(value.message))
const image = { url: 'https://www.antoinequarroz.ch/social/physiobaur/01.jpg', alt: 'Accueil PhysioBaur' }
describe('social image review', () => {
  it('preserves order and accepts official or configured storage images', () => {
    const second = { url: 'https://storage.example.com/storage/v1/object/public/media/uploads/02.png', alt: 'Contact' }
    expect(validateSocialImages([image, second], 'instagram', 'https://storage.example.com')).toEqual([image, second])
  })
  it.each(['https://attacker.example/image.jpg', 'https://www.antoinequarroz.ch.attacker.example/social/a.jpg', 'javascript:alert(1)', 'https://www.antoinequarroz.ch/social/a.svg', 'https://www.antoinequarroz.ch/social/a.jpg?tracking=1'])('rejects unsafe URLs %s', url => {
    expect(() => validateSocialImages([{ ...image, url }], 'linkedin')).toThrow()
  })
  it('rejects duplicates, missing alt and excess X images', () => {
    expect(() => validateSocialImages([image, image], 'instagram')).toThrow()
    expect(() => validateSocialImages([{ ...image, alt: ' ' }], 'instagram')).toThrow()
    expect(() => validateSocialImages(Array.from({ length: 5 }, (_, i) => ({ ...image, url: image.url.replace('01', String(i)) })), 'x')).toThrow()
  })
  it('blocks all image batches from automated delivery but allows text and PDF', () => {
    expect(() => requireAutomaticSocialMedia([image])).toThrow()
    expect(() => requireAutomaticSocialMedia([])).not.toThrow()
    expect(() => requireAutomaticSocialMedia(undefined)).not.toThrow()
  })
})
