import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { os } from '@orpc/server'
import { z } from 'zod'
import { ZodCoercer } from '../src'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('zodCoercer', () => {
  it('should coerce input', async () => {
    const fn = vi.fn().mockReturnValue('__mocked__')

    const router = os.router({
      ping: os
        .input(z.object({ val: z.bigint() }))
        .handler(fn),
    })

    const handler = new OpenAPIHandler(router, {
      schemaCoercers: [
        new ZodCoercer(),
      ],
    })
    const { response } = await handler.handle(new Request('https://example.com/ping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        val: '123',
      }),
    }))

    expect(response?.status).toBe(200)
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ input: { val: 123n } }))
  })
})
