import type { baseErrorMap, BaseMeta, outputSchema } from '../tests/shared'
import type { Meta } from './meta'
import type { ContractProcedure } from './procedure'
import type { ContractRouter, InferContractRouterInputs, InferContractRouterOutputs, InterContractRouterErrorMap, InterContractRouterMeta } from './router'
import { ping, pong, router } from '../tests/shared'

describe('ContractRouter', () => {
  describe('meta def', () => {
    it('works', () => {
      expectTypeOf(ping).toMatchTypeOf<ContractRouter<BaseMeta>>()
      expectTypeOf(pong).toMatchTypeOf<ContractRouter<BaseMeta>>()
      expectTypeOf(router).toMatchTypeOf<ContractRouter<BaseMeta>>()

      expectTypeOf(ping).not.toMatchTypeOf<ContractRouter<{ invalid: true }>>()
    })

    it('not allow conflict meta def', () => {
      expectTypeOf({
        ping: {} as ContractProcedure<
          undefined,
          typeof outputSchema,
          typeof baseErrorMap,
          { mode?: number }
        >,
      }).not.toMatchTypeOf<ContractRouter<BaseMeta>>()
    })

    it('works when meta def is wider', () => {
      expectTypeOf({
        ping: {} as ContractProcedure<
          undefined,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta & { extra?: string }
        >,
      }).toMatchTypeOf<ContractRouter<BaseMeta>>()
    })

    it('works when meta def is narrower', () => {
      expectTypeOf({
        ping: {} as ContractProcedure<
          undefined,
          typeof outputSchema,
          typeof baseErrorMap,
          Omit<BaseMeta, 'mode'>
        >,
      }).toMatchTypeOf<ContractRouter< BaseMeta>>()
    })
  })
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

it('InterContractRouterErrorMap', () => {
  expectTypeOf<InterContractRouterErrorMap<typeof router>>().toEqualTypeOf<typeof baseErrorMap | Record<never, never>>()
})

it('InterContractRouterMeta', () => {
  expectTypeOf<InterContractRouterMeta<typeof router>>().toEqualTypeOf<Meta | BaseMeta>()
})
