import type { MergedErrorMap, Meta } from '@orpc/contract'
import type { baseErrorMap, BaseMeta, inputSchema, outputSchema } from '../../contract/tests/shared'
import type { CurrentContext, InitialContext } from '../tests/shared'
import type { Context } from './context'
import type { Lazy } from './lazy'
import type { Procedure } from './procedure'
import type { AdaptedRouter, InferRouterInitialContext, InferRouterInputs, InferRouterOutputs, Router } from './router'
import { ping, pong, router } from '../tests/shared'

describe('Router', () => {
  it('context', () => {
    expectTypeOf(ping).toMatchTypeOf<Router<InitialContext, any>>()
    expectTypeOf(pong).toMatchTypeOf<Router<InitialContext, any>>()
    expectTypeOf(router).toMatchTypeOf<Router<InitialContext, any>>()

    expectTypeOf(ping).not.toMatchTypeOf<Router<Context, any>>()
  })
})

it('InferRouterInitialContext', () => {
  expectTypeOf<InferRouterInitialContext<typeof router>>().toEqualTypeOf<InitialContext & Context>()
  expectTypeOf<InferRouterInitialContext<typeof ping>>().toEqualTypeOf<InitialContext>()
  expectTypeOf<InferRouterInitialContext<typeof pong>>().toEqualTypeOf<Context>()
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
  type TErrorMap = { INVALID: { message: string }, OVERRIDE: { message: string } }
  type Applied = AdaptedRouter<typeof router, InitialContext, TErrorMap>

  expectTypeOf<Applied['ping']>().toEqualTypeOf<
    Lazy<
      Procedure<
        InitialContext,
        CurrentContext,
          typeof inputSchema,
          typeof outputSchema,
          { output: number },
          MergedErrorMap <TErrorMap, typeof baseErrorMap>,
          BaseMeta
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
          MergedErrorMap<TErrorMap, typeof baseErrorMap>,
          BaseMeta
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
      MergedErrorMap<TErrorMap, Record<never, never>>,
      Meta
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
        MergedErrorMap<TErrorMap, Record<never, never>>,
        Meta
      >
    >
  >()
})
