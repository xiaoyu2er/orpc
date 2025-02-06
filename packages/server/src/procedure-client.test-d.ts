import type { baseErrorMap, inputSchema, outputSchema } from '../../contract/tests/shared'
import { type Client, type ORPCError, safe } from '@orpc/contract'
import { ping, pong } from '../tests/shared'
import { createProcedureClient, type ProcedureClient } from './procedure-client'

describe('ProcedureClient', () => {
  const client = {} as ProcedureClient<
    'client-context',
    typeof inputSchema,
    typeof outputSchema,
    { output: number },
    typeof baseErrorMap
  >

  it('is a client', () => {
    expectTypeOf(client).toMatchTypeOf<
      Client<
        'client-context',
        { input: number },
        { output: string },
        Error | ORPCError<'BASE', { output: string }>
      >
    >()
  })

  it('works', async () => {
    const [output, error, isDefined] = await safe(client({ input: 123 }, { context: 'client-context' }))

    if (!error) {
      expectTypeOf(output).toEqualTypeOf<{ output: string }>()
    }

    if (isDefined) {
      expectTypeOf(error).toEqualTypeOf<ORPCError<'BASE', { output: string }> | ORPCError<'OVERRIDE', unknown>>()
    }

    // @ts-expect-error - invalid input
    client({ input: 'INVALID' }, { context: 'client-context' })
    // @ts-expect-error - invalid client context
    client({ input: 123 }, { context: 'INVALID' })
    // @ts-expect-error - client context is required
    client({ input: 123 })
  })

  it('can fallback to handler output', async () => {
    const client = {} as ProcedureClient<unknown, typeof inputSchema, undefined, { handler: number }, typeof baseErrorMap>

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
    const client = createProcedureClient(ping, { context: (clientContext: 'client-context') => ({ db: 'postgres' }) })

    expectTypeOf(client).toEqualTypeOf<
      ProcedureClient<
        'client-context',
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
})
