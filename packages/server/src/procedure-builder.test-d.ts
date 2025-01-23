import type { ContractProcedure, ErrorMap, MergedErrorMap, Route, Schema, StrictErrorMap } from '@orpc/contract'
import type { ReadonlyDeep } from '@orpc/shared'
import type { CurrentContext, InitialContext } from '../tests/shared'
import type { Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { MiddlewareOutputFn } from './middleware'
import type { Procedure } from './procedure'
import type { ProcedureBuilder } from './procedure-builder'
import type { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { DecoratedProcedure } from './procedure-decorated'
import { type baseErrorMap, type BaseMetaDef, inputSchema, outputSchema } from '../../contract/tests/shared'

const builder = {} as ProcedureBuilder<
  InitialContext,
  CurrentContext,
  typeof baseErrorMap,
  BaseMetaDef
>

describe('ProcedureBuilder', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<
        undefined,
        undefined,
        typeof baseErrorMap,
        Route,
        BaseMetaDef,
        BaseMetaDef
      >
    >()
  })

  it('.errors', () => {
    const applied = builder.errors({ BAD_GATEWAY: { message: 'BAD_GATEWAY' } })

    expectTypeOf(applied).toEqualTypeOf<
      ProcedureBuilder<
        InitialContext,
        CurrentContext,
        MergedErrorMap<typeof baseErrorMap, StrictErrorMap<ReadonlyDeep<{ BAD_GATEWAY: { message: 'BAD_GATEWAY' } }>>>,
        BaseMetaDef
      >
    >()

    // @ts-expect-error - invalid schema
    builder.errors({ BAD_GATEWAY: { data: {} } })
    // @ts-expect-error - not allow redefine error map
    builder.errors({ BASE: baseErrorMap.BASE })
  })

  it('.meta', () => {
    const applied = builder.meta({ mode: 'dev', log: true })

    expectTypeOf(applied).toEqualTypeOf<
      ProcedureBuilder<
        InitialContext,
        CurrentContext,
        typeof baseErrorMap,
        BaseMetaDef
      >
    >()

    // @ts-expect-error - invalid method
    builder.meta({ log: 'INVALID' })
  })

  it('.route', () => {
    const applied = builder.route({ method: 'POST', path: '/v2/users', tags: ['tag'] })

    expectTypeOf(applied).toEqualTypeOf<
      ProcedureBuilder<
        InitialContext,
        CurrentContext,
        typeof baseErrorMap,
        BaseMetaDef
      >
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'INVALID' })
  })

  it('.use', () => {
    const applied = builder.use(({ context, next, path, procedure, errors }, input, output) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<CurrentContext>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(procedure).toEqualTypeOf<Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, Route, BaseMetaDef, BaseMetaDef>>()
      expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<unknown>>()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()

      return next({
        context: {
          extra: true,
        },
      })
    })

    expectTypeOf(applied).toEqualTypeOf<
      ProcedureBuilder<
        InitialContext,
      CurrentContext & { extra: boolean },
      typeof baseErrorMap,
      BaseMetaDef
      >
    >()

    // @ts-expect-error --- conflict context
    builder.use(({ next }) => next({ context: { db: 123 } }))
    // @ts-expect-error --- input is not match
    builder.use(({ next }, input: 'invalid') => next({}))
    // @ts-expect-error --- output is not match
    builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
    // conflict context but not detected
    expectTypeOf(builder.use(({ next }) => next({ context: { db: undefined } }))).toEqualTypeOf<never>()
  })

  it('.input', () => {
    const applied = builder.input(inputSchema)

    expectTypeOf(applied).toEqualTypeOf<
      ProcedureBuilderWithInput<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof baseErrorMap,
        BaseMetaDef
      >
    >()

    // @ts-expect-error --- invalid schema
    builder.input({})
  })

  it('.output', () => {
    const applied = builder.output(outputSchema)

    expectTypeOf(applied).toEqualTypeOf<
      ProcedureBuilderWithOutput<
        InitialContext,
        CurrentContext,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMetaDef
      >
    >()

    // @ts-expect-error --- invalid schema
    builder.output({})
  })

  it('.handler', () => {
    const procedure = builder.handler(({ input, context, procedure, path, signal, errors }) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<CurrentContext>()
      expectTypeOf(procedure).toEqualTypeOf<Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, Route, BaseMetaDef, BaseMetaDef>>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()

      return 456
    })

    expectTypeOf(procedure).toEqualTypeOf<
      DecoratedProcedure<
        InitialContext,
        CurrentContext,
        undefined,
        undefined,
        number,
        typeof baseErrorMap,
        BaseMetaDef
      >
    >()
  })
})
