import type { H3Event } from 'h3'
import { createError, getHeader, getRequestWebStream, readRawBody } from 'h3'

function badRequest(message: string): never {
  throw createError({ statusCode: 400, message })
}

function payloadTooLarge(): never {
  throw createError({ statusCode: 413, message: 'Request payload is too large' })
}

/**
 * Reads an object-shaped JSON body while enforcing the limit during streaming.
 * This protects chunked requests too, where Content-Length is unavailable.
 */
export async function readJsonBodyLimited(event: H3Event, maxBytes: number): Promise<Record<string, unknown>> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error('maxBytes must be a positive integer')

  const contentType = (getHeader(event, 'content-type') || '').split(';', 1)[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') {
    throw createError({ statusCode: 415, message: 'Content-Type must be application/json' })
  }

  const contentEncoding = (getHeader(event, 'content-encoding') || 'identity').trim().toLowerCase()
  if (contentEncoding !== 'identity') {
    throw createError({ statusCode: 415, message: 'Compressed request bodies are not accepted' })
  }

  const contentLengthHeader = getHeader(event, 'content-length')
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader)
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) badRequest('Invalid Content-Length')
    if (contentLength > maxBytes) payloadTooLarge()
  }

  const stream = getRequestWebStream(event)
  let raw: string

  if (stream) {
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel('payload too large')
        payloadTooLarge()
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    try {
      raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    }
    catch {
      badRequest('Request body must be valid UTF-8')
    }
  }
  else {
    raw = await readRawBody(event, 'utf8') || ''
    if (Buffer.byteLength(raw, 'utf8') > maxBytes) payloadTooLarge()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    badRequest('Malformed JSON body')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) badRequest('Invalid JSON body')
  return parsed as Record<string, unknown>
}
