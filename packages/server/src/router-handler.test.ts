import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { initORPC } from '.'
import { createRouterHandler } from './router-handler'

const cases = [false, true]

const context = {
  userId: 1,
}

const orpc = initORPC.context<typeof context>()

describe('createRouterHandler', () => {
  it.each(cases)('works', async (serverless) => {
    const router = orpc.router({
      ping: orpc
        .use((input, context) => {
          expect(input).toStrictEqual({ input: true })
          expect(context).toStrictEqual({ userId: 1 })

          return {
            context: {
              mid: true,
            },
          }
        })
        .handler(async (input, context) => {
          expect(input).toStrictEqual({ input: true })
          expect(context).toStrictEqual({ mid: true, userId: 1 })

          return 'pong'
        }),

      ping2: orpc
        .route({
          method: 'POST',
          path: '/ping-2',
        })
        .handler(() => 'pong2'),
    })

    const handler = createRouterHandler({ router, serverless })

    const r1 = await handler({ input: true }, context, { method: 'POST', path: '/.ping' })
    const r2 = await handler(
      { input: true },
      context,
      { method: 'POST', path: '/.ping' },
      { internal: true }
    )

    expect(r1).toBe('pong')
    expect(r2).toBe('pong')

    const r3 = await handler({ input: true }, context, { method: 'POST', path: '/ping-2' })
    const r4 = await handler(
      { input: true },
      context,
      { method: 'POST', path: '/.ping2' },
      { internal: true }
    )

    expect(r3).toBe('pong2')
    expect(r4).toBe('pong2')
  })

  it.each(cases)('works with params', async (serverless) => {
    const router = orpc.router({
      ping: orpc
        .route({
          method: 'POST',
          path: '/ping/{id}',
        })
        .input(z.object({ id: z.coerce.number() }))
        .handler(async (input) => {
          expect(input).toStrictEqual({ id: 1 })

          return 'pong'
        }),
    })

    const handler = createRouterHandler({ router, serverless })

    const r1 = await handler(undefined, context, { method: 'POST', path: '/ping/1' })

    expect(r1).toBe('pong')
  })
})
