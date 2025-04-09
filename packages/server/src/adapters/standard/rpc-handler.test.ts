import { describe } from 'vitest'
import { os } from '../../builder'
import { StandardRPCHandler } from './rpc-handler'

describe('standardRPCHandler', () => {
  const handler = new StandardRPCHandler({
    ping: os.handler(({ input }) => ({ output: input })),
    pong: os.route({ method: 'GET' }).handler(({ input }) => ({ output: input })),
  }, {})

  it('works', async () => {
    const { response } = await handler.handle({
      url: new URL('https://example.com/api/v1/ping'),
      body: () => Promise.resolve({
        json: 'value',
      }),
      headers: {},
      method: 'POST',
      signal: undefined,
    }, {
      prefix: '/api/v1',
      context: {},
    })

    expect(response?.body).toEqual({ json: { output: 'value' } })
  })

  it('restrict GET method by default', async () => {
    const { response: r1 } = await handler.handle({
      url: new URL('https://example.com/api/v1/ping?data=%7B%7D'),
      body: () => Promise.resolve(undefined),
      headers: {},
      method: 'GET',
      signal: undefined,
    }, {
      prefix: '/api/v1',
      context: {},
    })

    expect(r1?.status).toEqual(405)

    const { response: r2 } = await handler.handle({
      url: new URL('https://example.com/api/v1/pong?data=%7B%7D'),
      body: () => Promise.resolve(undefined),
      headers: {},
      method: 'GET',
      signal: undefined,
    }, {
      prefix: '/api/v1',
      context: {},
    })

    expect(r2?.status).toEqual(200)
  })
})
