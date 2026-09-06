import { createServer, request } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp, eventHandler, toNodeListener } from 'h3'
import { readJsonBodyLimited } from '../server/utils/requestBody'

describe('bounded JSON request bodies', () => {
  const app = createApp()
  app.use('/', eventHandler(event => readJsonBodyLimited(event, 32)))
  const server = createServer(toNodeListener(app))
  let port = 0

  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => resolve())
    })
    port = (server.address() as AddressInfo).port
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  })

  it('accepts an object-shaped JSON request below the ceiling', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('returns 413 for oversized chunked bodies without relying on Content-Length', async () => {
    const status = await new Promise<number>((resolve, reject) => {
      const client = request({
        host: '127.0.0.1',
        port,
        path: '/',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      }, response => {
        response.resume()
        response.on('end', () => resolve(response.statusCode || 0))
      })
      client.on('error', reject)
      client.end(JSON.stringify({ message: 'x'.repeat(100) }))
    })

    expect(status).toBe(413)
  })

  it('rejects non-JSON and compressed bodies before parsing', async () => {
    const wrongType = await fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{}',
    })
    const compressed = await fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-encoding': 'gzip' },
      body: '{}',
    })

    expect(wrongType.status).toBe(415)
    expect(compressed.status).toBe(415)
  })
})
