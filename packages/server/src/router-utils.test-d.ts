import type { MergedErrorMap, Meta, Schema } from '@orpc/contract'
import type { baseErrorMap, BaseMeta, inputSchema, outputSchema } from '../../contract/tests/shared'
import type { CurrentContext, InitialContext, ping, pong, router } from '../tests/shared'
import type { Context } from './context'
import type { Lazy } from './lazy'
import type { Procedure } from './procedure'
import type { AccessibleLazyRouter, EnhancedRouter } from './router-utils'

it('AccessibleLazyRouter', () => {
    type Accessible = AccessibleLazyRouter<Lazy<typeof router>>

    expectTypeOf<Accessible['ping']>().toEqualTypeOf<Lazy<typeof ping>>()
    expectTypeOf<Accessible['nested']['ping']>().toEqualTypeOf<Lazy<typeof ping>>()

    expectTypeOf<Accessible['pong']>().toEqualTypeOf<Lazy<typeof pong>>()
    expectTypeOf<Accessible['nested']['pong']>().toEqualTypeOf<Lazy<typeof pong>>()
})

it('EnhancedRouter', () => {
    type TErrorMap = { INVALID: { message: string }, OVERRIDE: { message: string } }
    type Enhanced = EnhancedRouter<typeof router, InitialContext, TErrorMap>

    expectTypeOf<Enhanced['ping']>().toEqualTypeOf<
      Lazy<
        Procedure<
          InitialContext,
          CurrentContext,
            typeof inputSchema,
            typeof outputSchema,
            MergedErrorMap<TErrorMap, typeof baseErrorMap>,
            BaseMeta
        >
      >
    >()

    expectTypeOf<Enhanced['nested']['ping']>().toEqualTypeOf<
      Lazy<
        Procedure<
          InitialContext,
          CurrentContext,
            typeof inputSchema,
            typeof outputSchema,
            MergedErrorMap<TErrorMap, typeof baseErrorMap>,
            BaseMeta
        >
      >
    >()

    expectTypeOf<Enhanced['pong']>().toEqualTypeOf<
      Procedure<
        InitialContext,
        Context,
        Schema<unknown, unknown>,
        Schema<unknown, unknown>,
        MergedErrorMap<TErrorMap, Record<never, never>>,
        Meta
      >
    >()

    expectTypeOf<Enhanced['nested']['pong']>().toEqualTypeOf<
      Lazy<
        Procedure<
          InitialContext,
          Context,
          Schema<unknown, unknown>,
          Schema<unknown, unknown>,
          MergedErrorMap<TErrorMap, Record<never, never>>,
          Meta
        >
      >
    >()
})
