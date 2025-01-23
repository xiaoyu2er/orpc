import type { MergedErrorMap, Meta, Route } from '@orpc/contract'
import type { baseErrorMap, baseMeta, BaseMetaDef, inputSchema, outputSchema } from '../../contract/tests/shared'
import type { CurrentContext, InitialContext, router } from '../tests/shared'
import type { Context } from './context'
import type { Lazy } from './lazy'
import type { Procedure } from './procedure'
import type { AdaptedRouter, InferRouterInputs, InferRouterOutputs } from './router-utils'

it('InferRouterInputs', () => {
    type Inferred = InferRouterInputs<typeof router>

    expectTypeOf<Inferred['ping']>().toEqualTypeOf<{ input: number }>()
    expectTypeOf<Inferred['nested']['ping']>().toEqualTypeOf<{ input: number }>()

    expectTypeOf<Inferred['pong']>().toEqualTypeOf<unknown>()
    expectTypeOf<Inferred['nested']['pong']>().toEqualTypeOf<unknown>()
})

it('InferRouterOutputs', () => {
    type Inferred = InferRouterOutputs<typeof router>

    expectTypeOf<Inferred['ping']>().toEqualTypeOf<{ output: string }>()
    expectTypeOf<Inferred['nested']['ping']>().toEqualTypeOf<{ output: string }>()

    expectTypeOf<Inferred['pong']>().toEqualTypeOf<unknown>()
    expectTypeOf<Inferred['nested']['pong']>().toEqualTypeOf<unknown>()
})

it('AdaptedRouter', () => {
    type Applied = AdaptedRouter<typeof router, InitialContext, typeof baseErrorMap>

    expectTypeOf<Applied['ping']>().toEqualTypeOf<
      Lazy<
        Procedure<
          InitialContext,
          CurrentContext,
            typeof inputSchema,
            typeof outputSchema,
            { output: number },
            typeof baseErrorMap,
            Route,
            BaseMetaDef,
            typeof baseMeta
        >
      >
    >()

    expectTypeOf<Applied['nested']['ping']>().toEqualTypeOf<
      Lazy<
        Procedure<
          InitialContext,
          CurrentContext,
            typeof inputSchema,
            typeof outputSchema,
            { output: number },
            typeof baseErrorMap,
            Route,
            BaseMetaDef,
            typeof baseMeta
        >
      >
    >()

    expectTypeOf<Applied['pong']>().toEqualTypeOf<
      Procedure<
        InitialContext,
        Context,
        undefined,
        undefined,
        unknown,
        MergedErrorMap<typeof baseErrorMap, Record<never, never>>,
        Route,
        Meta,
        Record<never, never>
      >
    >()

    expectTypeOf<Applied['nested']['pong']>().toEqualTypeOf<
      Lazy<
        Procedure<
          InitialContext,
          Context,
          undefined,
          undefined,
          unknown,
          MergedErrorMap<typeof baseErrorMap, Record<never, never>>,
          Route,
          Meta,
          Record<never, never>
        >
      >
    >()
})
