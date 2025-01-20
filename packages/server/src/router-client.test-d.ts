import type { Client, NestedClient, ORPCError, Route } from '@orpc/contract'
import type { Context } from './context'
import type { Procedure } from './procedure'
import type { Meta } from './types'
import { z } from 'zod'
import { lazy } from './lazy'
import { createRouterClient, type RouterClient } from './router-client'

const schema = z.object({ val: z.string().transform(val => Number(val)) })
const baseErrors = {
  CODE: {
    data: z.object({ why: z.string().transform(v => Number(v)) }),
  },
}

const route = { method: 'GET', path: '/ping' } as const

const ping = {} as Procedure<Context, Context, typeof schema, typeof schema, { val: string }, typeof baseErrors, typeof route>
const pong = {} as Procedure<{ auth: boolean }, { auth: boolean }, undefined, undefined, unknown, Record<never, never>, Route>

const router = {
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
}

const routerWithLazy = {
  ping: lazy(() => Promise.resolve({ default: ping })),
  pong,
  nested: lazy(() => Promise.resolve({ default: {
    ping,
    pong: lazy(() => Promise.resolve({ default: pong })),
  } })),
}

describe('RouterClient', () => {
  it('compatible with NestedClient', () => {
    expectTypeOf<RouterClient<typeof router, unknown>>().toMatchTypeOf<NestedClient<unknown>>()
    expectTypeOf<RouterClient<typeof router, 'invalid'>>().not.toMatchTypeOf<NestedClient<unknown>>()
  })

  it('router without lazy', () => {
    const client = {} as RouterClient<typeof router, unknown>

    expectTypeOf(client.ping).toEqualTypeOf<
      Client<unknown, { val: string }, { val: number }, Error | ORPCError<'CODE', { why: number }>>
    >()
    expectTypeOf(client.pong).toEqualTypeOf<
      Client<unknown, unknown, unknown, Error>
    >()

    expectTypeOf(client.nested.ping).toEqualTypeOf<
      Client<unknown, { val: string }, { val: number }, Error | ORPCError<'CODE', { why: number }>>
    >()
    expectTypeOf(client.nested.pong).toEqualTypeOf<
      Client<unknown, unknown, unknown, Error>
    >()
  })

  it('support lazy', () => {
    expectTypeOf<RouterClient<typeof routerWithLazy, unknown>>().toEqualTypeOf<RouterClient<typeof router, unknown>>()
  })

  it('support procedure as router', () => {
    expectTypeOf<RouterClient<typeof ping, unknown>>().toEqualTypeOf<Client<unknown, { val: string }, { val: number }, Error | ORPCError<'CODE', { why: number }>>>()
  })
})

describe('createRouterClient', () => {
  it('return RouterClient', () => {
    const client = createRouterClient(router, {
      context: { auth: true },
    })

    expectTypeOf(client).toMatchTypeOf<RouterClient<typeof router, unknown>>()

    const client2 = createRouterClient(routerWithLazy, {
      context: { auth: true },
    })
    expectTypeOf(client2).toMatchTypeOf<RouterClient<typeof routerWithLazy, unknown>>()
  })

  it('required context when needed', () => {
    createRouterClient({ ping })

    createRouterClient({ pong }, {
      context: { auth: true },
    })

    createRouterClient({ pong }, {
      context: () => ({ auth: true }),
    })

    createRouterClient({ pong }, {
      context: async () => ({ auth: true }),
    })

    createRouterClient({ pong }, {
      // @ts-expect-error --- invalid context
      context: { auth: 'invalid' },
    })

    // @ts-expect-error --- missing context
    createRouterClient({ pong })
  })

  it('support hooks', () => {
    createRouterClient(router, {
      context: { auth: true },
      onSuccess: async ({ output }, context, meta) => {
        expectTypeOf(output).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<Context & { auth: boolean }>()
        expectTypeOf(meta).toEqualTypeOf<Meta>()
      },
    })
  })

  it('support base path', () => {
    createRouterClient({ ping }, {
      context: { auth: true },
      path: ['users'],
    })

    // @ts-expect-error --- invalid path
    createRouterClient({ ping }, {
      context: { auth: true },
      path: [123],
    })
  })

  it('with client context', () => {
    const client = createRouterClient(router, {
      context: async (clientContext: { cache?: boolean } | undefined) => {
        return { auth: true }
      },
    })

    client.ping({ val: '123' })
    client.ping({ val: '123' }, { context: { cache: true } })
    // @ts-expect-error - invalid context
    client.ping({ val: '123' }, { context: { cache: '123' } })
  })
})
