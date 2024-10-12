import { initORPCContract } from '@orpc/contract'
import { createRouterHandler, initORPC } from '@orpc/server'
import { fetchHandler } from '@orpc/server/fetch'
import { z } from 'zod'
import { createRouterClient } from './router'

describe('createRouterClient', () => {
  const orpc = initORPC
  const schema = z.object({
    value: z.string(),
  })
  const ping = orpc.input(schema).handler((_, __, { path }) => path)
  const router = orpc.router({
    ping,
    nested: {
      unique: ping,
    },
  })
  const handler = createRouterHandler({
    router,
  })
  const orpcFetch: typeof fetch = async (...args) => {
    const request = new Request(...args)
    return await fetchHandler({
      prefix: '/orpc',
      request,
      handler,
      context: {},
    })
  }

  it('types with contract router', () => {
    const orpc = initORPCContract
    const schema = z.object({
      value: z.string(),
    })

    const ping = orpc.input(schema)
    const pong = orpc.output(schema)
    const peng = orpc.route({})
    const router = orpc.router({
      ping,
      pong,
      peng,
      nested: {
        unique: ping,
      },
    })

    const client = createRouterClient<typeof router>({} as any)

    expectTypeOf(client.ping).toEqualTypeOf<
      (input: { value: string }) => Promise<unknown>
    >()
    expectTypeOf(client.pong).toEqualTypeOf<
      (input: unknown) => Promise<{ value: string }>
    >()
    expectTypeOf(client.peng).toEqualTypeOf<
      (input: unknown) => Promise<unknown>
    >()

    expectTypeOf(client.nested.unique).toEqualTypeOf<
      (input: { value: string }) => Promise<unknown>
    >()
  })

  it('types with router', () => {
    const schema = z.object({
      value: z.string(),
    })
    const ping = orpc.input(schema).handler(() => '')
    const pong = orpc.output(schema).handler(() => ({ value: 'string' }))
    const peng = orpc.route({}).handler(() => ({ age: 1244 }))

    const router = orpc.router({
      ping,
      pong,
      peng,
      nested: {
        unique: ping,
      },
    })

    const client = createRouterClient<typeof router>({} as any)

    expectTypeOf(client.ping).toEqualTypeOf<
      (input: { value: string }) => Promise<string>
    >()
    expectTypeOf(client.pong).toEqualTypeOf<
      (input: unknown) => Promise<{ value: string }>
    >()
    expectTypeOf(client.peng).toEqualTypeOf<
      (input: unknown) => Promise<{ age: number }>
    >()
    expectTypeOf(client.nested.unique).toEqualTypeOf<
      (input: { value: string }) => Promise<string>
    >()
  })

  it('simple', async () => {
    const client = createRouterClient<typeof router>({
      baseURL: 'http://localhost:3000/orpc',
      fetch: orpcFetch,
    })

    const result = await client.ping({ value: 'hello' })
    expect(result).toEqual(['ping'])

    const result2 = await client.nested.unique({ value: 'hello' })
    expect(result2).toEqual(['nested', 'unique'])
  })

  it('on error', () => {
    const client = createRouterClient<typeof router>({
      baseURL: 'http://localhost:3000/orpc',
      fetch: orpcFetch,
    })

    // @ts-expect-error
    expect(client.ping({ value: 1244 })).rejects.toThrowError(
      'Validation input failed',
    )
  })

  it('transformer', async () => {
    const router = orpc.router({
      ping: orpc
        .input(z.object({ value: z.date() }))
        .handler((input) => input.value),
    })

    const handler = createRouterHandler({
      router,
    })

    const client = createRouterClient<typeof router>({
      baseURL: 'http://localhost:3000/orpc',
      fetch: (...args) => {
        const request = new Request(...args)
        return fetchHandler({
          prefix: '/orpc',
          request,
          handler,
          context: {},
        })
      },
    })

    const now = new Date()
    expect(await client.ping({ value: now })).toEqual(now)
  })
})
