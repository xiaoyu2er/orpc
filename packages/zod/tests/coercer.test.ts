import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { os } from '@orpc/server'
import { z } from 'zod'
import { ZodAutoCoercePlugin } from '../src'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('zodAutoCoercePlugin', () => {
  it('should coerce input', async () => {
    const fn = vi.fn().mockReturnValue('__mocked__')

    const router = os.router({
      ping: os
        .route({ path: '/ping/{id}', inputStructure: 'detailed' })
        .input(z.object({
          params: z.object({
            id: z.number(),
          }),
          body: z.object({ val: z.bigint() }),
        }))
        .handler(fn),
    })

    const handler = new OpenAPIHandler(router, {
      plugins: [
        new ZodAutoCoercePlugin(),
      ],
    })
    const { response } = await handler.handle(new Request('https://example.com/ping/12345', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        val: '123',
      }),
    }))

    expect(response?.status).toBe(200)
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        params: { id: 12345 },
        body: { val: 123n },
      },
    }))
  })
})
