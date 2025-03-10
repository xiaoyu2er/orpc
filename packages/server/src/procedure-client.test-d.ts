import type { Client, ClientContext } from '@orpc/client'
import type { ErrorMap, ORPCError, Schema } from '@orpc/contract'
import type { baseErrorMap, BaseMeta, inputSchema, outputSchema } from '../../contract/tests/shared'
import type { Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { Procedure } from './procedure'
import { safe } from '@orpc/client'
import { ping, pong } from '../tests/shared'
import { createProcedureClient, type ProcedureClient } from './procedure-client'

describe('ProcedureClient', () => {
  const client = {} as ProcedureClient<
    { cache: boolean },
    typeof inputSchema,
    typeof outputSchema,
    { output: number },
    typeof baseErrorMap
  >

  it('is a client', () => {
    expectTypeOf(client).toMatchTypeOf<
      Client<
        { cache: boolean },
        { input: number },
        { output: string },
        Error | ORPCError<'BASE', { output: string }>
      >
    >()
  })

  it('works', async () => {
    const [error, data, isDefined] = await safe(client({ input: 123 }, { context: { cache: true } }))

    if (!error) {
      expectTypeOf(data).toEqualTypeOf<{ output: string }>()
    }

    if (isDefined) {
      expectTypeOf(error).toEqualTypeOf<ORPCError<'BASE', { output: string }> | ORPCError<'OVERRIDE', unknown>>()
    }

    // @ts-expect-error - invalid input
    client({ input: 'INVALID' }, { context: { cache: true } })
    // @ts-expect-error - invalid client context
    client({ input: 123 }, { context: 'INVALID' })
    // @ts-expect-error - client context is required
    client({ input: 123 })
  })

  it('can fallback to handler output', async () => {
    const client = {} as ProcedureClient<ClientContext, typeof inputSchema, undefined, { handler: number }, typeof baseErrorMap>

    const output = await client({ input: 123 })

    expectTypeOf(output).toEqualTypeOf<{ handler: number }>()
  })
})

describe('createProcedureClient', () => {
  it('works with context', () => {
    createProcedureClient(ping, { context: { db: 'postgres' } })
    createProcedureClient(ping, { context: () => ({ db: 'postgres' }) })
    createProcedureClient(ping, { context: async () => ({ db: 'postgres' }) })
    // @ts-expect-error - invalid context
    createProcedureClient(ping, { context: { db: 123 } })
    // @ts-expect-error - context is required
    createProcedureClient(ping)
    // context is optional
    createProcedureClient(pong)
  })

  it('can type client context', () => {
    const client = createProcedureClient(ping, { context: (clientContext: { cache?: boolean }) => ({ db: 'postgres' }) })

    expectTypeOf(client).toEqualTypeOf<
      ProcedureClient<
        { cache?: boolean },
        typeof inputSchema,
        typeof outputSchema,
        { output: number },
        typeof baseErrorMap
      >
    >()
  })

  it('optional context when all fields are optional', () => {
    createProcedureClient(pong)
    createProcedureClient(pong, {})

    // @ts-expect-error - context is required
    createProcedureClient(ping)
    // @ts-expect-error - context is required
    createProcedureClient(ping, {})
    createProcedureClient(ping, { context: { db: 'postgres' } })
  })

  it('well type interceptor', () => {
    createProcedureClient(ping, {
      context: { db: 'postgres' },
      interceptors: [
        async ({ next, signal, procedure, path, errors, context, input }) => {
          expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
          expectTypeOf(procedure).toEqualTypeOf<
            Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
          >()
          expectTypeOf(path).toEqualTypeOf<readonly string[]>()
          expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
          expectTypeOf(context).toEqualTypeOf<{ db: string }>()
          expectTypeOf(input).toEqualTypeOf<{ input: number }>()

          const output = await next()

          expectTypeOf(output).toEqualTypeOf<{ output: string }>()

          return output
        },
      ],
    })
  })
})
