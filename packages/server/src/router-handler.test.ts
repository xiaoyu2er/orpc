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
        .output(z.string())
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

    const r1 = await handler('POST', '/.ping', { input: true }, context)
    const r2 = await handler('POST', '/.ping', { input: true }, context)

    expect(r1).toBe('pong')
    expect(r2).toBe('pong')

    const r3 = await handler(undefined, 'ping2', { input: true }, context)
    const r4 = await handler(undefined, 'ping2', { input: true }, context)

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

    const r1 = await handler('POST', '/ping/1', undefined, context)

    expect(r1).toBe('pong')
  })

  it('bypass params on non empty and non object input', () => {
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

    const handler = createRouterHandler({ router })

    expect(handler(undefined, 'ping', undefined, context)).rejects.toThrow(
      'Validation input failed',
    )
    expect(handler('POST', '/ping/1', null, context)).rejects.toThrow(
      'Validation input failed',
    )
    expect(handler('POST', '/ping/1', 123, context)).rejects.toThrow(
      'Validation input failed',
    )
    expect(handler('POST', '/ping/1', '123', context)).rejects.toThrow(
      'Validation input failed',
    )
  })

  test('on nested router', async () => {
    const router = orpc.router({
      users: {
        find: orpc.handler(() => 'find'),
      },
    })

    const handler = createRouterHandler({ router })

    const output = await handler('POST', '/.users.find', undefined, context)

    expect(output).toBe('find')
  })

  it('hooks on success', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()

    const router = orpc.router({
      ping: orpc.output(z.string()).handler(() => {
        return 'pong'
      }),
    })

    const handler = createRouterHandler({
      router,
      hooks: (context, hooks) => {
        hooks.onSuccess(onSuccess)
        hooks.onError(onError)
        hooks.onFinish(onFinish)
      },
    })

    await handler('POST', '/.ping', 'input', context)

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(0)
    expect(onFinish).toHaveBeenCalledTimes(1)

    expect(onSuccess).toHaveBeenCalledWith('pong')
    expect(onFinish).toHaveBeenCalledWith('pong', undefined)
  })
})
