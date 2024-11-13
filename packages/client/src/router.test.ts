import { oc } from '@orpc/contract'
import { os } from '@orpc/server'
import { createFetchHandler } from '@orpc/server/fetch'
import { z } from 'zod'
import { createRouterClient } from './router'

describe('createRouterClient', () => {
  const schema = z.object({
    value: z.string(),
  })
  const ping = os.input(schema).handler((_, __, { path }) => path)
  const router = os.router({
    ping,
    nested: {
      unique: ping,
    },
  })
  const handler = createFetchHandler({
    router,
  })
  const orpcFetch: typeof fetch = async (...args) => {
    const request = new Request(...args)
    return await handler({
      prefix: '/orpc',
      request,
      context: {},
    })
  }

  it('types with contract router', () => {
    const schema = z.object({
      value: z.string(),
    })

    const ping = oc.input(schema)
    const pong = oc.output(schema)
    const peng = oc.route({})
    const router = oc.router({
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
    const ping = os.input(schema).handler(() => '')
    const pong = os.output(schema).handler(() => ({ value: 'string' }))
    const peng = os.route({}).handler(() => ({ age: 1244 }))

    const router = os.router({
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
    expect(client.ping({ value: {} })).rejects.toThrowError(
      'Validation input failed',
    )
  })

  it('transformer', async () => {
    const router = os.router({
      ping: os
        .input(z.object({ value: z.date() }))
        .handler((input) => input.value),
    })

    const handler = createFetchHandler({
      router,
    })

    const client = createRouterClient<typeof router>({
      baseURL: 'http://localhost:3000/orpc',
      fetch: (...args) => {
        const request = new Request(...args)
        return handler({
          prefix: '/orpc',
          request,
          context: {},
        })
      },
    })

    const now = new Date()
    expect(await client.ping({ value: now })).toEqual(now)
  })
})
