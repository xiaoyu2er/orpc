import type { CallerOptions } from '@orpc/server'
import { oc } from '@orpc/contract'
import { os } from '@orpc/server'
import { createORPCHandler, handleFetchRequest } from '@orpc/server/fetch'
import { z } from 'zod'
import { createRouterClient } from './router'

describe('createRouterClient', () => {
  const schema = z.object({
    value: z.string(),
  })
  const ping = os.input(schema).func((_, __, { path }) => path)
  const router = os.router({
    ping,
    nested: {
      unique: ping,
    },
  })
  const orpcFetch: typeof fetch = async (...args) => {
    const request = new Request(...args)
    return await handleFetchRequest({
      router,
      prefix: '/orpc',
      request,
      context: {},
      handlers: [createORPCHandler()],
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

    expectTypeOf(client.ping).toMatchTypeOf<
      (input: { value: string }, options?: CallerOptions) => Promise<unknown>
    >()
    expectTypeOf(client.pong).toMatchTypeOf<
      (input: unknown, options?: CallerOptions) => Promise<{ value: string }>
    >()
    expectTypeOf(client.peng).toMatchTypeOf<
      (input: unknown, options?: CallerOptions) => Promise<unknown>
    >()

    expectTypeOf(client.nested.unique).toMatchTypeOf<
      (input: { value: string }, options?: CallerOptions) => Promise<unknown>
    >()
  })

  it('types with router', () => {
    const schema = z.object({
      value: z.string(),
    })
    const ping = os.input(schema).func(() => '')
    const pong = os.output(schema).func(() => ({ value: 'string' }))
    const peng = os.route({}).func(() => ({ age: 1244 }))

    const router = os.router({
      ping,
      pong,
      peng,
      nested: {
        unique: ping,
      },
    })

    const client = createRouterClient<typeof router>({} as any)

    expectTypeOf(client.ping).toMatchTypeOf<
      (input: { value: string }, options?: CallerOptions) => Promise<string>
    >()
    expectTypeOf(client.pong).toMatchTypeOf<
      (input: unknown, options?: CallerOptions) => Promise<{ value: string }>
    >()
    expectTypeOf(client.peng).toMatchTypeOf<
      (input: unknown, options?: CallerOptions) => Promise<{ age: number }>
    >()
    expectTypeOf(client.nested.unique).toMatchTypeOf<
      (input: { value: string }, options?: CallerOptions) => Promise<string>
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

    // @ts-expect-error - invalid input
    expect(client.ping({ value: {} })).rejects.toThrowError(
      'Validation input failed',
    )
  })

  it('transformer', async () => {
    const router = os.router({
      ping: os
        .input(z.object({ value: z.date() }))
        .func(input => input.value),
    })

    const client = createRouterClient<typeof router>({
      baseURL: 'http://localhost:3000/orpc',
      fetch: (...args) => {
        const request = new Request(...args)
        return handleFetchRequest({
          router,
          prefix: '/orpc',
          request,
          context: {},
          handlers: [createORPCHandler()],
        })
      },
    })

    const now = new Date()
    expect(await client.ping({ value: now })).toEqual(now)
  })
})
