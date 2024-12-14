import type { Caller, Meta, WELL_CONTEXT } from './types'
import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { createLazy } from './lazy'
import { Procedure } from './procedure'
import { createProcedureCaller } from './procedure-caller'

beforeEach(() => {
  vi.resetAllMocks()
})

const schema = z.object({ val: z.string().transform(v => Number(v)) })
const func = vi.fn()
const procedure = new Procedure<WELL_CONTEXT, { val: string }, typeof schema, typeof schema, { val: string }>({
  contract: new ContractProcedure({
    InputSchema: schema,
    OutputSchema: schema,
  }),
  func,
})
const procedureWithContext = new Procedure<{ userId?: string }, { db: string }, typeof schema, typeof schema, { val: string }>({
  contract: new ContractProcedure({
    InputSchema: schema,
    OutputSchema: schema,
  }),
  func,
})

describe('createProcedureCaller', () => {
  it('just a caller', () => {
    const caller = createProcedureCaller({
      procedure,
    })

    expectTypeOf(caller).toEqualTypeOf<Caller<{ val: string }, { val: number }>>()
  })

  it('context can be optional and can be a sync or async function', () => {
    createProcedureCaller({
      procedure,
    })

    createProcedureCaller({
      procedure,
      context: undefined,
    })

    // @ts-expect-error - missing context
    createProcedureCaller({
      procedure: procedureWithContext,
    })

    createProcedureCaller({
      procedure: procedureWithContext,
      context: { userId: '123' },
    })

    createProcedureCaller({
      procedure: procedureWithContext,
      // @ts-expect-error invalid context
      context: { userId: 123 },
    })

    createProcedureCaller({
      procedure: procedureWithContext,
      context: () => ({ userId: '123' }),
    })

    createProcedureCaller({
      procedure: procedureWithContext,
      // @ts-expect-error invalid context
      context: () => ({ userId: 123 }),
    })

    createProcedureCaller({
      procedure: procedureWithContext,
      context: async () => ({ userId: '123' }),
    })

    createProcedureCaller({
      procedure: procedureWithContext,
      // @ts-expect-error invalid context
      context: async () => ({ userId: 123 }),
    })
  })

  it('accept hooks', () => {
    createProcedureCaller({
      procedure,

      async execute(input, context, meta) {
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
    createProcedureCaller({
      procedure,
      path: ['users'],
    })

    createProcedureCaller({
      procedure,
      // @ts-expect-error - invalid path
      path: [123],
    })
  })
})

describe('createProcedure on invalid lazy procedure', () => {
  const lazy = createLazy(() => Promise.resolve({ default: procedure }))
  const lazyWithContext = createLazy(() => Promise.resolve({ default: procedureWithContext }))

  it('just a caller', () => {
    const caller = createProcedureCaller({
      procedure: lazy,
    })

    expectTypeOf(caller).toEqualTypeOf<Caller<{ val: string }, { val: number }>>()
  })

  it('context can be optional and can be a sync or async function', () => {
    createProcedureCaller({
      procedure: lazy,
    })

    createProcedureCaller({
      procedure: lazy,
      context: undefined,
    })

    // @ts-expect-error - missing context
    createProcedureCaller({
      procedure: lazyWithContext,
    })

    createProcedureCaller({
      procedure: lazyWithContext,
      context: { userId: '123' },
    })

    createProcedureCaller({
      procedure: lazyWithContext,
      // @ts-expect-error invalid context
      context: { userId: 123 },
    })

    createProcedureCaller({
      procedure: lazyWithContext,
      context: () => ({ userId: '123' }),
    })

    createProcedureCaller({
      procedure: lazyWithContext,
      // @ts-expect-error invalid context
      context: () => ({ userId: 123 }),
    })

    createProcedureCaller({
      procedure: lazyWithContext,
      context: async () => ({ userId: '123' }),
    })

    createProcedureCaller({
      procedure: lazyWithContext,
      // @ts-expect-error invalid context
      context: async () => ({ userId: 123 }),
    })
  })

  it('accept hooks', () => {
    createProcedureCaller({
      procedure: lazy,

      async execute(input, context, meta) {
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
    createProcedureCaller({
      procedure: lazy,
      path: ['users'],
    })

    createProcedureCaller({
      procedure: lazy,
      // @ts-expect-error - invalid path
      path: [123],
    })
  })
})
