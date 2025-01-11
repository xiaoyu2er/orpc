import type { Client, ORPCError } from '@orpc/contract'
import type { Procedure } from './procedure'
import type { ProcedureClient } from './procedure-client'
import type { Meta, WELL_CONTEXT, WithSignal } from './types'
import { z } from 'zod'
import { lazy } from './lazy'
import { createProcedureClient } from './procedure-client'

beforeEach(() => {
  vi.resetAllMocks()
})

const baseSchema = z.string().transform(v => Number(v))
const baseErrors = {
  CODE: {
    data: z.object({ why: z.string().transform(v => Number(v)) }),
  },
}

const optionalBaseSchema = baseSchema.optional()

describe('ProcedureClient', () => {
  const fn: ProcedureClient<unknown, typeof baseSchema, typeof baseSchema, string, typeof baseErrors> = async (...[input, options]) => {
    expectTypeOf(input).toEqualTypeOf<string>()
    expectTypeOf(options).toEqualTypeOf<(WithSignal & { context?: unknown }) | undefined>()
    return 123
  }

  const fnWithOptionalInput: ProcedureClient<unknown, typeof optionalBaseSchema, typeof baseSchema, string, typeof baseErrors> = async (...args) => {
    const [input, options] = args

    expectTypeOf(input).toEqualTypeOf<string | undefined>()
    expectTypeOf(options).toEqualTypeOf<(WithSignal & { context?: unknown }) | undefined>()
    return 123
  }

  it('just a client', () => {
    expectTypeOf(fn).toEqualTypeOf<Client<unknown, string, number, Error | ORPCError<'CODE', { why: number }>>>()
  })

  it('just a function', () => {
    expectTypeOf(fn).toMatchTypeOf<(input: string, options: WithSignal & { context?: unknown }) => Promise<number>>()
    expectTypeOf(fnWithOptionalInput).toMatchTypeOf<(input: string | undefined, options: WithSignal & { context?: unknown }) => Promise<number>>()
  })

  it('infer correct input', () => {
    fn('123')
    fnWithOptionalInput('123')

    // @ts-expect-error - invalid input
    fn(123)
    // @ts-expect-error - invalid input
    fnWithOptionalInput(123)

    // @ts-expect-error - invalid input
    fn({})
    // @ts-expect-error - invalid input
    fnWithOptionalInput({})
  })

  it('accept signal', () => {
    fn('123', { signal: new AbortSignal() })
    fnWithOptionalInput('123', { signal: new AbortSignal() })

    // @ts-expect-error - invalid signal
    fn('123', { signal: 1234 })
    // @ts-expect-error - invalid signal
    fnWithOptionalInput('123', { signal: 1234 })
  })

  it('can accept call without args', () => {
    expectTypeOf(fnWithOptionalInput()).toMatchTypeOf<Promise<number>>()
    // @ts-expect-error - input is required
    expectTypeOf(fn()).toEqualTypeOf<Promise<number>>()
  })

  describe('context', () => {
    it('can accept context', () => {
      const client = {} as ProcedureClient<{ userId: string }, typeof baseSchema, typeof baseSchema, string, typeof baseErrors>

      client('input', { context: { userId: '123' } })
      // @ts-expect-error - invalid context
      client('input', { context: { userId: 123 } })
      // @ts-expect-error - context is required
      client('input')
    })

    it('optional options when context is optional', () => {
      const client = {} as ProcedureClient<undefined | { userId: string }, typeof baseSchema, typeof baseSchema, string, typeof baseErrors>

      client('input')
      client('input', { context: { userId: '123' } })
    })

    it('can call without args when both input and context are optional', () => {
      const client = {} as ProcedureClient<undefined | { userId: string }, typeof optionalBaseSchema, typeof baseSchema, string, typeof baseErrors>

      client()
      client('input', { context: { userId: '123' } })
      // @ts-expect-error - input is invalid
      client(123, { context: { userId: '123' } })
      // @ts-expect-error - context is invalid
      client('input', { context: { userId: 123 } })
    })
  })
})

describe('createProcedureClient', () => {
  const schema = z.object({ val: z.string().transform(v => Number(v)) })
  const baseErrors = {
    CODE: {
      data: z.object({ why: z.string().transform(v => Number(v)) }),
    },
  }
  const procedure = {} as Procedure<WELL_CONTEXT, { val: string }, typeof schema, typeof schema, { val: string }, typeof baseErrors>
  const procedureWithContext = {} as Procedure<{ userId?: string }, { db: string }, typeof schema, typeof schema, { val: string }, undefined>

  it('just a client', () => {
    const client = createProcedureClient(procedure)

    expectTypeOf(client).toEqualTypeOf<ProcedureClient<unknown, typeof schema, typeof schema, { val: string }, typeof baseErrors>>()
  })

  it('context can be optional and can be a sync or async function', () => {
    createProcedureClient(procedure)

    createProcedureClient(procedure, {
      context: undefined,
    })

    // @ts-expect-error - missing context
    createProcedureClient(procedureWithContext)

    // @ts-expect-error - missing context
    createProcedureClient(procedureWithContext, {})

    createProcedureClient(procedureWithContext, {
      context: { userId: '123' },
    })

    createProcedureClient(procedureWithContext, {
      // @ts-expect-error invalid context
      context: { userId: 123 },
    })

    createProcedureClient(procedureWithContext, {
      context: () => ({ userId: '123' }),
    })

    createProcedureClient(procedureWithContext, {
      // @ts-expect-error invalid context
      context: () => ({ userId: 123 }),
    })

    createProcedureClient(procedureWithContext, {
      context: async () => ({ userId: '123' }),
    })

    createProcedureClient(procedureWithContext, {
      // @ts-expect-error invalid context
      context: async () => ({ userId: 123 }),
    })
  })

  it('accept hooks', () => {
    createProcedureClient(procedure, {
      async interceptor(input, context, meta) {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<WELL_CONTEXT>()
        expectTypeOf(meta).toEqualTypeOf<Meta & { next: () => Promise<{ val: number }> }>()

        return { val: 123 }
      },

      onStart(state, context, meta) {
        expectTypeOf(state).toEqualTypeOf<{ status: 'pending', input: unknown, output: undefined, error: undefined }>()
        expectTypeOf(context).toEqualTypeOf<WELL_CONTEXT>()
        expectTypeOf(meta).toEqualTypeOf<Meta>()
      },

      onSuccess(state, context, meta) {
        expectTypeOf(state).toEqualTypeOf<{ status: 'success', input: unknown, output: { val: number }, error: undefined }>()
        expectTypeOf(context).toEqualTypeOf<WELL_CONTEXT>()
        expectTypeOf(meta).toEqualTypeOf<Meta>()
      },

      onError(state, context, meta) {
        expectTypeOf(state).toEqualTypeOf<{ status: 'error', input: unknown, output: undefined, error: Error }>()
        expectTypeOf(context).toEqualTypeOf<WELL_CONTEXT>()
        expectTypeOf(meta).toEqualTypeOf<Meta>()
      },

      onFinish(state, context, meta) {
        expectTypeOf(state).toEqualTypeOf<{ status: 'success', input: unknown, output: { val: number }, error: undefined } | { status: 'error', input: unknown, output: undefined, error: Error }>()
        expectTypeOf(context).toEqualTypeOf<WELL_CONTEXT>()
        expectTypeOf(meta).toEqualTypeOf<Meta>()
      },
    })
  })

  it('accept paths', () => {
    createProcedureClient(procedure, {
      path: ['users'],
    })

    // @ts-expect-error - invalid path
    createProcedureClient(procedure, {
      path: [123],
    })
  })

  it('with client context', () => {
    const client = createProcedureClient(procedure, {
      context: async (clientContext: { cache?: boolean } | undefined) => {
        return {}
      },
    })

    client({ val: '123' })
    client({ val: '123' }, { context: { cache: true } })
    // @ts-expect-error - invalid context
    client({ val: '123' }, { context: { cache: '123' } })
  })
})

it('support lazy procedure', () => {
  const schema = z.object({ val: z.string().transform(v => Number(v)) })
  const procedure = {} as Procedure<{ userId?: string }, undefined, typeof schema, typeof schema, { val: string }, undefined>
  const lazied = lazy(() => Promise.resolve({ default: procedure }))

  const client = createProcedureClient(lazied, {
    context: async () => ({ userId: 'string' }),
    path: ['users'],

    onSuccess(state, context, meta) {
      expectTypeOf(state).toEqualTypeOf<{ status: 'success', input: unknown, output: { val: number }, error: undefined }>()
      expectTypeOf(context).toEqualTypeOf<{ userId: string }>()
      expectTypeOf(meta).toEqualTypeOf<Meta>()
    },
  })

  expectTypeOf(client).toEqualTypeOf<ProcedureClient<unknown, typeof schema, typeof schema, { val: string }, undefined>>()
})
