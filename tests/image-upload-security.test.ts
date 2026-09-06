import { describe, expect, it } from 'vitest'
import {
  ALLOWED_IMAGE_MIME_TYPES,
  isStrictMediaBucket,
  MAX_IMAGE_BYTES,
  validateImageDataUrl,
} from '../server/utils/imageUpload'

function dataUrl(mime: string, bytes: Buffer) {
  return `data:${mime};base64,${bytes.toString('base64')}`
}

function minimalPng(width: number, height: number) {
  const bytes = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes)
  bytes.write('IHDR', 12, 'ascii')
  bytes.writeUInt32BE(width, 16)
  bytes.writeUInt32BE(height, 20)
  return bytes
}

function minimalJpeg(width: number, height: number) {
  const bytes = Buffer.alloc(23)
  Buffer.from([0xff, 0xd8, 0xff, 0xc0]).copy(bytes)
  bytes.writeUInt16BE(17, 4)
  bytes[6] = 8
  bytes.writeUInt16BE(height, 7)
  bytes.writeUInt16BE(width, 9)
  bytes[21] = 0xff
  bytes[22] = 0xd9
  return bytes
}

function minimalWebp(width: number, height: number) {
  const bytes = Buffer.alloc(30)
  bytes.write('RIFF', 0, 'ascii')
  bytes.writeUInt32LE(22, 4)
  bytes.write('WEBP', 8, 'ascii')
  bytes.write('VP8X', 12, 'ascii')
  bytes.writeUInt32LE(10, 16)
  bytes.writeUIntLE(width - 1, 24, 3)
  bytes.writeUIntLE(height - 1, 27, 3)
  return bytes
}

describe('admin image upload validation', () => {
  it('accepts a PNG whose signature and safe dimensions match its declared MIME type', () => {
    const result = validateImageDataUrl(dataUrl('image/png', minimalPng(1_200, 630)))
    expect(result.mime).toBe('image/png')
    expect(result.extension).toBe('png')
    expect([result.width, result.height]).toEqual([1_200, 630])
  })

  it('accepts JPEG and WebP signatures with safe dimensions', () => {
    const jpeg = validateImageDataUrl(dataUrl('image/jpeg', minimalJpeg(800, 600)))
    const webp = validateImageDataUrl(dataUrl('image/webp', minimalWebp(1_024, 768)))

    expect([jpeg.extension, jpeg.width, jpeg.height]).toEqual(['jpg', 800, 600])
    expect([webp.extension, webp.width, webp.height]).toEqual(['webp', 1_024, 768])
  })

  it('rejects SVG, MIME spoofing and decompression-bomb-style dimensions', () => {
    expect(() => validateImageDataUrl(dataUrl('image/svg+xml', Buffer.from('<svg/>')))).toThrow()
    expect(() => validateImageDataUrl(dataUrl('image/jpeg', minimalPng(32, 32)))).toThrow()
    expect(() => validateImageDataUrl(dataUrl('image/png', minimalPng(8_000, 8_000)))).toThrow()
  })

  it('fails closed when the storage bucket lacks exact MIME and size restrictions', () => {
    expect(isStrictMediaBucket({
      public: true,
      file_size_limit: MAX_IMAGE_BYTES,
      allowed_mime_types: [...ALLOWED_IMAGE_MIME_TYPES],
    })).toBe(true)
    expect(isStrictMediaBucket({ public: true, file_size_limit: null, allowed_mime_types: null })).toBe(false)
    expect(isStrictMediaBucket({
      public: true,
      file_size_limit: MAX_IMAGE_BYTES,
      allowed_mime_types: [...ALLOWED_IMAGE_MIME_TYPES, 'image/svg+xml'],
    })).toBe(false)
  })
})
