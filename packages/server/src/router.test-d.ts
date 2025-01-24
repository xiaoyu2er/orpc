import type { MergedErrorMap, Meta, Route } from '@orpc/contract'
import type { baseErrorMap, baseMeta, inputSchema, outputSchema } from '../../contract/tests/shared'
import type { CurrentContext, InitialContext } from '../tests/shared'
import type { Context } from './context'
import type { Lazy } from './lazy'
import type { Procedure } from './procedure'
import type { Router } from './router'
import type { AdaptedRouter, InferRouterInputs, InferRouterOutputs } from './router-utils'
import { ping, pong, router } from '../tests/shared'

describe('Router', () => {
  it('context', () => {
    expectTypeOf(ping).toMatchTypeOf<Router<InitialContext, any>>()
    expectTypeOf(pong).toMatchTypeOf<Router<InitialContext, any>>()
    expectTypeOf(router).toMatchTypeOf<Router<InitialContext, any>>()

    expectTypeOf(ping).not.toMatchTypeOf<Router<Context, any>>()
  })
})

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
            BaseMeta,
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
            BaseMeta,
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
