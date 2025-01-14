import type { ORPCErrorConstructorMap } from './error'
import type { Middleware, MiddlewareOutputFn } from './middleware'
import type { ANY_PROCEDURE } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { ProcedureImplementer } from './procedure-implementer'
import type { WELL_CONTEXT } from './types'
import { z } from 'zod'

const baseSchema = z.object({ base: z.string().transform(v => Number.parseInt(v)) })
const baseErrors = {
  PAYMENT_REQUIRED: {
    status: 402,
    message: 'default message',
    data: baseSchema,
  },
}

const implementer = {} as ProcedureImplementer<{ id?: string }, { extra: true }, typeof baseSchema, typeof baseSchema, typeof baseErrors>

describe('self chainable', () => {
  it('use middleware', () => {
    const i = implementer
      .use(({ context, path, next, procedure, errors }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ base: number }>()
        expectTypeOf(context).toEqualTypeOf<{ id?: string } & { extra: true }>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ base: string }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

        return next({
          context: {
            auth: true,
          },
        })
      })
      .use(({ context, path, next, procedure, errors }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ base: number }>()
        expectTypeOf(context).toEqualTypeOf<{ id?: string } & { auth: boolean } & { extra: true }>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ base: string }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

        return next({})
      })

    expectTypeOf(i).toEqualTypeOf<
      ProcedureImplementer<
        { id?: string },
        { auth: boolean } & { extra: true },
        typeof baseSchema,
        typeof baseSchema,
        typeof baseErrors
      >
    >()
  })

  it('use middleware with map input', () => {
    const mid: Middleware<WELL_CONTEXT, { id: string, extra: true }, number, any, Record<never, never>> = ({ next }) => {
      return next({
        context: { id: 'string', extra: true },
      })
    }

    const i = implementer.use(mid, (input) => {
      expectTypeOf(input).toEqualTypeOf<{ base: number }>()
      return input.base
    })

    expectTypeOf(i).toEqualTypeOf<
      ProcedureImplementer<
        { id?: string },
        { extra: true } & { id: string, extra: true },
        typeof baseSchema,
        typeof baseSchema,
        typeof baseErrors
      >
    >()

    // @ts-expect-error - invalid input
    implementer.use(mid)

    // @ts-expect-error - invalid mapped input
    implementer.use(mid, input => input)
  })

  it('prevent conflict on context', () => {
    implementer.use(({ context, path, next }, input) => next({}))
    implementer.use(({ context, path, next }, input) => next({ context: { id: '1' } }))
    implementer.use(({ context, path, next }, input) => next({ context: { id: '1', extra: true } }))
    implementer.use(({ context, path, next }, input) => next({ context: { auth: true } }))

    implementer.use(({ context, path, next }, input) => next({}), () => 'anything')
    implementer.use(({ context, path, next }, input) => next({ context: { id: '1' } }), () => 'anything')
    implementer.use(({ context, path, next }, input) => next({ context: { id: '1', extra: true } }), () => 'anything')
    implementer.use(({ context, path, next }, input) => next({ context: { auth: true } }), () => 'anything')

    // @ts-expect-error - conflict with context
    implementer.use(({ context, path, next }, input) => next({ context: { id: 1 } }))

    // @ts-expect-error - conflict with context
    implementer.use(({ context, path, next }, input) => next({ context: { id: 1, extra: true } }))

    // @ts-expect-error - conflict with context
    implementer.use(({ context, path, next }, input) => next({ context: { id: 1 } }), () => 'anything')

    // @ts-expect-error - conflict with context
    implementer.use(({ context, path, next }, input) => next({ context: { id: 1, extra: true } }), () => 'anything')
  })

  it('handle middleware with output is typed', () => {
    const mid1 = {} as Middleware<WELL_CONTEXT, undefined, unknown, any, Record<never, never>>
    const mid2 = {} as Middleware<WELL_CONTEXT, undefined, unknown, { base: string }, Record<never, never>>
    const mid3 = {} as Middleware<WELL_CONTEXT, undefined, unknown, unknown, Record<never, never>>
    const mid4 = {} as Middleware<WELL_CONTEXT, undefined, unknown, { base: number }, Record<never, never>>

    implementer.use(mid1)
    implementer.use(mid2)
    // @ts-expect-error - required used any for output
    implementer.use(mid3)
    // @ts-expect-error - output is not match
    implementer.use(mid4)
  })
})

describe('to DecoratedProcedure', () => {
  it('handler', () => {
    const procedure = implementer.handler(({ input, context, procedure, path, signal, errors }) => {
      expectTypeOf(context).toEqualTypeOf<{ id?: string } & { extra: true }>()
      expectTypeOf(input).toEqualTypeOf<{ base: number }>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

      return { base: '1' }
    })

    expectTypeOf(procedure).toEqualTypeOf<
      DecoratedProcedure<{ id?: string }, { extra: true }, typeof baseSchema, typeof baseSchema, { base: string }, typeof baseErrors>
    >()

    // @ts-expect-error - invalid output
    implementer.handler(() => ({ base: 1 }))

    // @ts-expect-error - invalid output
    implementer.handler(() => {})
  })
})
