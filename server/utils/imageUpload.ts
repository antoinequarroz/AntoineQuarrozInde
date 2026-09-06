import { createError } from 'h3'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_IMAGE_DIMENSION = 8_192
export const MAX_IMAGE_PIXELS = 25_000_000
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

// JSON quotes, the data URL prefix and a little structural headroom are
// included on top of the largest possible base64 representation.
export const MAX_IMAGE_REQUEST_BYTES = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 1_024

type AllowedImageMime = typeof ALLOWED_IMAGE_MIME_TYPES[number]

export type ValidatedImage = {
  buffer: Buffer
  mime: AllowedImageMime
  extension: 'jpg' | 'png' | 'webp'
  width: number
  height: number
}

function badRequest(message: string): never {
  throw createError({ statusCode: 400, message })
}

function pngDimensions(buffer: Buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature) || buffer.toString('ascii', 12, 16) !== 'IHDR') return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

function jpegDimensions(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) return null
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
  let offset = 2
  while (offset + 3 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }
    while (buffer[offset] === 0xff) offset += 1
    const marker = buffer[offset]
    offset += 1
    if (marker === undefined || marker === 0xd9 || marker === 0xda) break
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset + 2 > buffer.length) return null
    const segmentLength = buffer.readUInt16BE(offset)
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return null
    if (startOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) return null
      return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) }
    }
    offset += segmentLength
  }
  return null
}

function readUInt24LE(buffer: Buffer, offset: number) {
  return buffer[offset]! | (buffer[offset + 1]! << 8) | (buffer[offset + 2]! << 16)
}

function webpDimensions(buffer: Buffer) {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null
  const chunk = buffer.toString('ascii', 12, 16)
  if (chunk === 'VP8X') {
    return { width: readUInt24LE(buffer, 24) + 1, height: readUInt24LE(buffer, 27) + 1 }
  }
  if (chunk === 'VP8 ' && buffer.length >= 30 && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
  }
  if (chunk === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    const b1 = buffer[21]!
    const b2 = buffer[22]!
    const b3 = buffer[23]!
    const b4 = buffer[24]!
    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | (b2 >> 6)),
    }
  }
  return null
}

export function validateImageDataUrl(input: unknown): ValidatedImage {
  if (typeof input !== 'string') badRequest('Invalid image payload')
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(input)
  if (!match) badRequest('Malformed image data URL')

  const mime = match[1] as AllowedImageMime
  const base64 = match[2] || ''
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mime)) badRequest('Only JPEG, PNG and WebP images are accepted')
  if (!base64 || base64.length % 4 !== 0) badRequest('Malformed base64 image data')
  if (base64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) {
    throw createError({ statusCode: 413, message: 'Image payload is too large' })
  }

  const buffer = Buffer.from(base64, 'base64')
  if (!buffer.length) badRequest('Image is empty')
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 413, message: 'Image payload is too large' })
  }

  const dimensions = mime === 'image/png'
    ? pngDimensions(buffer)
    : mime === 'image/jpeg'
      ? jpegDimensions(buffer)
      : webpDimensions(buffer)

  if (!dimensions) badRequest(`Image bytes do not match ${mime}`)
  const { width, height } = dimensions
  if (width <= 0 || height <= 0 || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION || width * height > MAX_IMAGE_PIXELS) {
    badRequest('Image dimensions are not allowed')
  }

  return {
    buffer,
    mime,
    extension: mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp',
    width,
    height,
  }
}

export function isStrictMediaBucket(bucket: Record<string, unknown> | null | undefined) {
  if (!bucket || bucket.public !== true) return false
  const fileSizeLimit = Number(bucket.file_size_limit)
  if (!Number.isFinite(fileSizeLimit) || fileSizeLimit <= 0 || fileSizeLimit > MAX_IMAGE_BYTES) return false
  const allowed = Array.isArray(bucket.allowed_mime_types) ? bucket.allowed_mime_types.map(String).sort() : []
  const required = [...ALLOWED_IMAGE_MIME_TYPES].sort()
  return allowed.length === required.length && allowed.every((mime, index) => mime === required[index])
}
