import type { RouteOptions } from '@orpc/contract'
import type { Middleware } from './middleware'
import type { ANY_PROCEDURE } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { ProcedureImplementer } from './procedure-implementer'
import type { WELL_CONTEXT } from './types'
import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { ProcedureBuilder } from './procedure-builder'

describe('self chainable', () => {
  const builder = new ProcedureBuilder<{ id?: string }, undefined, undefined, undefined, undefined>({
    contract: new ContractProcedure({
      InputSchema: undefined,
      OutputSchema: undefined,
      errorMap: undefined,
    }),
    middlewares: [],
  })

  const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })

  it('route', () => {
    expectTypeOf(builder.route).toEqualTypeOf((route: RouteOptions) => builder)
  })

  it('input', () => {
    expectTypeOf(builder.input(schema))
      .toEqualTypeOf<ProcedureBuilder<{ id?: string }, undefined, typeof schema, undefined, undefined>>()

    expectTypeOf(builder.input(schema, { id: '1' }))
      .toEqualTypeOf<ProcedureBuilder<{ id?: string }, undefined, typeof schema, undefined, undefined>>()

    // @ts-expect-error - invalid schema
    builder.input({})

    // @ts-expect-error - invalid example
    builder.input(schema, {})

    // @ts-expect-error - invalid example
    builder.input(schema, { id: 1 })
  })

  it('output', () => {
    expectTypeOf(builder.output(schema))
      .toEqualTypeOf<ProcedureBuilder<{ id?: string }, undefined, undefined, typeof schema, undefined>>()

    expectTypeOf(builder.output(schema, { id: 1 }))
      .toEqualTypeOf<ProcedureBuilder<{ id?: string }, undefined, undefined, typeof schema, undefined>>()

    // @ts-expect-error - invalid schema
    builder.output({})

    // @ts-expect-error - invalid example
    builder.output(schema, {})

    // @ts-expect-error - invalid example
    builder.output(schema, { id: '1' })
  })
})

describe('to ProcedureImplementer', () => {
  const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })

  const builder = new ProcedureBuilder<{ id?: string } | undefined, undefined, typeof schema, typeof schema, undefined>({
    contract: new ContractProcedure({
      InputSchema: schema,
      OutputSchema: schema,
      errorMap: undefined,
    }),
    middlewares: [],
  })

  it('use middleware', () => {
    const implementer = builder.use(async ({ context, path, next }, input) => {
      expectTypeOf(context).toEqualTypeOf<{ id?: string } | undefined>()
      expectTypeOf(input).toEqualTypeOf<{ id: number }>()

      const result = await next({})

      expectTypeOf(result.output).toEqualTypeOf<{ id: string }>()

      return next({ context: { id: '1', extra: true } })
    })

    expectTypeOf(implementer).toEqualTypeOf<
      ProcedureImplementer<{ id?: string } | undefined, { id: string, extra: boolean }, typeof schema, typeof schema, undefined>
    >()
  })

  it('use middleware with map input', () => {
    const mid: Middleware<WELL_CONTEXT, { id: string, extra: boolean }, number, any, Record<string, unknown>> = ({ next }) => {
      return next({
        context: { id: 'string', extra: true },
      })
    }

    const implementer = builder.use(mid, (input) => {
      expectTypeOf(input).toEqualTypeOf<{ id: number }>()
      return input.id
    })

    expectTypeOf(implementer).toEqualTypeOf<
      ProcedureImplementer<{ id?: string } | undefined, { id: string, extra: boolean }, typeof schema, typeof schema, undefined>
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
  const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })

  const builder = new ProcedureBuilder<{ id?: string } | undefined, undefined, typeof schema, typeof schema, undefined>({
    contract: new ContractProcedure({
      InputSchema: schema,
      OutputSchema: schema,
      errorMap: undefined,
    }),
    middlewares: [],
  })

  it('handler', () => {
    const procedure = builder.handler(async ({ input, context, path, procedure, signal }) => {
      expectTypeOf(context).toEqualTypeOf<{ id?: string } | undefined>()
      expectTypeOf(input).toEqualTypeOf<{ id: number }>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

      return { id: '1' }
    })

    expectTypeOf(procedure).toEqualTypeOf<
      DecoratedProcedure<{ id?: string } | undefined, undefined, typeof schema, typeof schema, { id: string }, undefined>
    >()

    // @ts-expect-error - invalid output
    builder.handler(async ({ input, context }) => ({ id: 1 }))

    // @ts-expect-error - invalid output
    builder.handler(async ({ input, context }) => (true))
  })
})
