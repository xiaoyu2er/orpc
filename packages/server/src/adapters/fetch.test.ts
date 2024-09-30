import { describe, expect, it } from 'vitest'
import { createRouterHandler, initORPC } from '..'
import { fetchHandler } from './fetch'

describe('simple', () => {
  const orpc = initORPC.context<{ auth?: boolean }>()
  const router = orpc.router({
    ping: orpc.handler(async () => 'pong'),
  })
  const handler = createRouterHandler({
    router,
  })

  it('200', async () => {
    const response = await fetchHandler({
      prefix: '/orpc',
      handler,
      request: new Request('http://localhost/orpc.ping', {
        method: 'POST',
      }),
      context: { auth: true },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toBe('pong')
  })

  it('404', async () => {
    const response = await fetchHandler({
      prefix: '/orpc',
      handler,
      request: new Request('http://localhost/orpc.pingp', {
        method: 'POST',
      }),
      context: { auth: true },
    })

    expect(response.status).toBe(404)
  })
})
