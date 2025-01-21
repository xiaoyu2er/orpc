import type { UnshiftedMiddlewaresRouter } from '@orpc/server'
import type { baseErrorMap, baseMeta, BaseMetaDef, baseRoute, inputSchema, outputSchema } from '../tests/shared'
import type { Meta } from './meta'
import type { ContractProcedure } from './procedure'
import type { PrefixedRoute } from './route-utils'
import type { AdaptedContractRouter, InferContractRouterInputs, InferContractRouterOutputs } from './router-utils'
import { ping, pong } from '../tests/shared'

const router = {
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
}

it('AdaptedContractRouter', () => {
  const adapted = {} as AdaptedContractRouter<typeof router, typeof baseErrorMap, '/prefix', ['tag']>

  expectTypeOf(adapted.ping).toMatchTypeOf<
    ContractProcedure<
    typeof inputSchema,
    typeof outputSchema,
    typeof baseErrorMap,
    PrefixedRoute<UnshiftedMiddlewaresRouter<typeof baseRoute, ['tag']>, '/prefix'>,
    BaseMetaDef,
    typeof baseMeta
    >
  >()

  expectTypeOf(adapted.nested.ping).toMatchTypeOf<
    ContractProcedure<
            typeof inputSchema,
            typeof outputSchema,
            typeof baseErrorMap,
            PrefixedRoute<UnshiftedMiddlewaresRouter<typeof baseRoute, ['tag']>, '/prefix'>,
            BaseMetaDef,
            typeof baseMeta
    >
  >()

  expectTypeOf(adapted.pong).toMatchTypeOf<
    ContractProcedure<
      undefined,
      undefined,
      Record<never, never>,
      Record<never, never>,
      Meta,
      Record<never, never>
    >
  >()
})

it('InferContractRouterInputs', () => {
    type Inputs = InferContractRouterInputs<typeof router>

    expectTypeOf<Inputs['ping']>().toEqualTypeOf<{ input: number }>()
    expectTypeOf<Inputs['pong']>().toEqualTypeOf<unknown>()

    expectTypeOf<Inputs['nested']['ping']>().toEqualTypeOf<{ input: number }>()
    expectTypeOf<Inputs['nested']['pong']>().toEqualTypeOf<unknown>()
})

it('InferContractRouterOutputs', () => {
    type Outputs = InferContractRouterOutputs<typeof router>

    expectTypeOf<Outputs['ping']>().toEqualTypeOf<{ output: string }>()
    expectTypeOf<Outputs['pong']>().toEqualTypeOf<unknown>()

    expectTypeOf<Outputs['nested']['ping']>().toEqualTypeOf<{ output: string }>()
    expectTypeOf<Outputs['nested']['pong']>().toEqualTypeOf<unknown>()
})
