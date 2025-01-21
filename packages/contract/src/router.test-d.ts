import type { UnshiftedMiddlewaresRouter } from '@orpc/server'
import type { baseErrorMap, baseMeta, BaseMetaDef, baseRoute, inputSchema, outputSchema } from '../tests/shared'
import type { ErrorMap } from './error-map'
import type { Meta } from './meta'
import type { ContractProcedure } from './procedure'
import type { PrefixedRoute } from './route'
import type { AdaptedContractRouter, ContractRouter, InferContractRouterInputs, InferContractRouterOutputs } from './router'
import { ping, pong } from '../tests/shared'

const router = {
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
}

describe('ContractRouter', () => {
  describe('error map', () => {
    it('works', () => {
      expectTypeOf(ping).toMatchTypeOf<ContractRouter<typeof baseErrorMap, any>>()
      expectTypeOf(pong).not.toMatchTypeOf<ContractRouter<typeof baseErrorMap, any>>()
      expectTypeOf(router).not.toMatchTypeOf<ContractRouter<typeof baseErrorMap, any>>()

      // this pattern can prevent conflict error map between router and procedure
      expectTypeOf(router).toMatchTypeOf<ContractRouter<ErrorMap & Partial<typeof baseErrorMap>, any>>()
    })

    it('not allow conflict', () => {
      expectTypeOf({
        ping: {} as ContractProcedure<
          undefined,
          typeof outputSchema,
          { BASE: { message: string } },
          { description: string },
          BaseMetaDef,
          typeof baseMeta
        >,
      }).not.toMatchTypeOf<ContractRouter<typeof baseErrorMap, any>>()
    })

    it('not allow match error but not match strict error', () => {
      expectTypeOf({
        ping: {} as ContractProcedure<
          undefined,
          typeof outputSchema,
          { BASE: { message: 'this field is not exists on base error map', data: typeof outputSchema } },
          { description: string },
          BaseMetaDef,
          typeof baseMeta
        >,
      }).not.toMatchTypeOf<ContractRouter<typeof baseErrorMap, any>>()
    })
  })

  describe('meta def', () => {
    it('works', () => {
      expectTypeOf(ping).toMatchTypeOf<ContractRouter<any, BaseMetaDef>>()
      expectTypeOf(pong).toMatchTypeOf<ContractRouter<any, BaseMetaDef>>()
      expectTypeOf(router).toMatchTypeOf<ContractRouter<any, BaseMetaDef>>()

      expectTypeOf(ping).not.toMatchTypeOf<ContractRouter<any, { invalid: true }>>()
    })

    it('not allow conflict meta def', () => {
      expectTypeOf({
        ping: {} as ContractProcedure<
          undefined,
          typeof outputSchema,
          typeof baseErrorMap,
          { description: string },
          { mode?: number },
          { mode: 123 }
        >,
      }).not.toMatchTypeOf<ContractRouter<any, BaseMetaDef>>()
    })

    it('works when meta def is wider', () => {
      expectTypeOf({
        ping: {} as ContractProcedure<
          undefined,
          typeof outputSchema,
          typeof baseErrorMap,
          { description: string },
          BaseMetaDef & { extra?: string },
          typeof baseMeta
        >,
      }).toMatchTypeOf<ContractRouter<any, BaseMetaDef>>()
    })

    it('works when meta def is narrower', () => {
      expectTypeOf({
        ping: {} as ContractProcedure<
          undefined,
          typeof outputSchema,
          typeof baseErrorMap,
          { description: string },
          Omit<BaseMetaDef, 'mode'>,
          typeof baseMeta
        >,
      }).toMatchTypeOf<ContractRouter<any, BaseMetaDef>>()
    })
  })
})

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
