import type { ORPCError } from '@orpc/contract'
import type { Procedure } from './procedure'
import type { ProcedureClient } from './procedure-client'
import type { Meta, WELL_CONTEXT } from './types'
import { z } from 'zod'
import { lazy } from './lazy'
import { createRouterClient, type RouterClient } from './router-client'

const schema = z.object({ val: z.string().transform(val => Number(val)) })
const baseErrors = {
  CODE: {
    data: z.object({ why: z.string().transform(v => Number(v)) }),
  },
}

const ping = {} as Procedure<WELL_CONTEXT, undefined, typeof schema, typeof schema, { val: string }, typeof baseErrors>
const pong = {} as Procedure<{ auth: boolean }, undefined, undefined, undefined, unknown, undefined>

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
  it('router without lazy', () => {
    const client = {} as RouterClient<typeof router, unknown>

    expectTypeOf(client.ping).toEqualTypeOf<
      ProcedureClient<unknown, { val: string }, { val: number }, Error | ORPCError<'CODE', { why: number }>>
    >()
    expectTypeOf(client.pong).toEqualTypeOf<
      ProcedureClient<unknown, unknown, unknown, Error>
    >()

    expectTypeOf(client.nested.ping).toEqualTypeOf<
      ProcedureClient<unknown, { val: string }, { val: number }, Error | ORPCError<'CODE', { why: number }>>
    >()
    expectTypeOf(client.nested.pong).toEqualTypeOf<
      ProcedureClient<unknown, unknown, unknown, Error>
    >()
  })

  it('support lazy', () => {
    expectTypeOf<RouterClient<typeof routerWithLazy, unknown>>().toEqualTypeOf<RouterClient<typeof router, unknown>>()
  })

  it('support procedure as router', () => {
    expectTypeOf<RouterClient<typeof ping, unknown>>().toEqualTypeOf<ProcedureClient<unknown, { val: string }, { val: number }, Error | ORPCError<'CODE', { why: number }>>>()
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
        expectTypeOf(context).toEqualTypeOf<Record<string, unknown> & {
          auth: boolean
        }>()
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
})
