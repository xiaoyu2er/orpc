import type { RouteOptions } from '@orpc/contract'
import type { ORPCErrorConstructorMap } from './error'
import type { Middleware } from './middleware'
import type { ANY_PROCEDURE } from './procedure'
import type { ProcedureBuilder } from './procedure-builder'
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

const builder = {} as ProcedureBuilder<{ id?: string }, { extra: true }, typeof baseSchema, typeof baseSchema, typeof baseErrors>

const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })

describe('self chainable', () => {
  it('route', () => {
    expectTypeOf(builder.route).toEqualTypeOf((route: RouteOptions) => builder)
  })

  it('input', () => {
    expectTypeOf(builder.input(schema))
      .toEqualTypeOf<ProcedureBuilder<{ id?: string }, { extra: true }, typeof schema, typeof baseSchema, typeof baseErrors>>()

    expectTypeOf(builder.input(schema, { id: '1' }))
      .toEqualTypeOf<ProcedureBuilder<{ id?: string }, { extra: true }, typeof schema, typeof baseSchema, typeof baseErrors>>()

    // @ts-expect-error - invalid schema
    builder.input({})

    // @ts-expect-error - invalid example
    builder.input(schema, {})

    // @ts-expect-error - invalid example
    builder.input(schema, { id: 1 })
  })

  it('output', () => {
    expectTypeOf(builder.output(schema))
      .toEqualTypeOf<ProcedureBuilder<{ id?: string }, { extra: true }, typeof baseSchema, typeof schema, typeof baseErrors>>()

    expectTypeOf(builder.output(schema, { id: 1 }))
      .toEqualTypeOf<ProcedureBuilder<{ id?: string }, { extra: true }, typeof baseSchema, typeof schema, typeof baseErrors>>()

    // @ts-expect-error - invalid schema
    builder.output({})

    // @ts-expect-error - invalid example
    builder.output(schema, {})

    // @ts-expect-error - invalid example
    builder.output(schema, { id: '1' })
  })

  it('errors', () => {
    expectTypeOf(builder.errors({ ANYTHING: { data: schema } })).toEqualTypeOf<
      ProcedureBuilder<{ id?: string }, { extra: true }, typeof baseSchema, typeof baseSchema, { ANYTHING: { data: typeof schema } }>
    >()

    // @ts-expect-error - invalid schema
    builder.errors({ ANYTHING: { data: {} } })
  })
})

describe('to ProcedureImplementer', () => {
  it('use middleware', () => {
    const implementer = builder.use(async ({ context, path, next, errors }, input) => {
      expectTypeOf(context).toEqualTypeOf<{ id?: string } & { extra: true }>()
      expectTypeOf(input).toEqualTypeOf<{ base: number }>()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

      const result = await next({})

      expectTypeOf(result.output).toEqualTypeOf<{ base: string }>()

      return next({ context: { id: '1', extra: true } })
    })

    expectTypeOf(implementer).toEqualTypeOf<
      ProcedureImplementer<{ id?: string }, { extra: true } & { id: string, extra: true }, typeof baseSchema, typeof baseSchema, typeof baseErrors>
    >()
  })

  it('use middleware with map input', () => {
    const mid: Middleware<WELL_CONTEXT, { id: string, extra: true }, number, any, Record<string, unknown>> = ({ next }) => {
      return next({
        context: { id: 'string', extra: true },
      })
    }

    const implementer = builder.use(mid, (input) => {
      expectTypeOf(input).toEqualTypeOf<{ base: number }>()
      return input.base
    })

    expectTypeOf(implementer).toEqualTypeOf<
      ProcedureImplementer<{ id?: string }, { extra: true } & { id: string, extra: true }, typeof baseSchema, typeof baseSchema, typeof baseErrors>
    >()

    // @ts-expect-error - invalid input
    builder.use(mid)

    // @ts-expect-error - invalid mapped input
    builder.use(mid, input => input)
  })

  it('use middleware prevent conflict on context', () => {
    builder.use(({ context, path, next }, input) => next({}))
    builder.use(({ context, path, next }, input) => next({ context: { id: '1' } }))
    builder.use(({ context, path, next }, input) => next({ context: { id: '1', extra: true } }))
    builder.use(({ context, path, next }, input) => next({ context: { auth: true } }))

    builder.use(({ context, path, next }, input) => next({}), () => 'anything')
    builder.use(({ context, path, next }, input) => next({ context: { id: '1' } }), () => 'anything')
    builder.use(({ context, path, next }, input) => next({ context: { id: '1', extra: true } }), () => 'anything')
    builder.use(({ context, path, next }, input) => next({ context: { auth: true } }), () => 'anything')

    // @ts-expect-error - conflict with context
    builder.use(({ context, path, next }, input) => next({ context: { id: 1 } }))

    // @ts-expect-error - conflict with context
    builder.use(({ context, path, next }, input) => next({ context: { id: 1, extra: true } }))

    // @ts-expect-error - conflict with context
    builder.use(({ context, path, next }, input) => next({ context: { id: 1 } }), () => 'anything')

    // @ts-expect-error - conflict with context
    builder.use(({ context, path, next }, input) => next({ context: { id: 1, extra: true } }), () => 'anything')
  })

  it('not allow use middleware with output is typed', () => {
    const mid1 = {} as Middleware<WELL_CONTEXT, undefined, unknown, any, Record<string, unknown>>
    const mid2 = {} as Middleware<WELL_CONTEXT, undefined, unknown, unknown, Record<string, unknown>>
    const mid3 = {} as Middleware<WELL_CONTEXT, undefined, unknown, { type: 'post', id: string }, Record<string, unknown>>

    builder.use(mid1)

    // @ts-expect-error - required used any for output
    builder.use(mid2)
    // @ts-expect-error - typed output is not allow because builder is not know output yet
    builder.use(mid3)
  })
})

describe('to DecoratedProcedure', () => {
  it('handler', () => {
    const procedure = builder.handler(async ({ input, context, path, procedure, signal, errors }) => {
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
    builder.handler(async ({ input, context }) => ({ id: 1 }))

    // @ts-expect-error - invalid output
    builder.handler(async ({ input, context }) => (true))
  })
})
