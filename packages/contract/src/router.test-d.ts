import type { baseErrorMap, BaseMeta, inputSchema, outputSchema } from '../tests/shared'
import type { MergedErrorMap } from './error-map'
import type { Meta } from './meta'
import type { ContractProcedure } from './procedure'
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

it('AdaptedContractRouter', () => {
  const adapted = {} as AdaptedContractRouter<typeof router, { INVALID: { status: number }, BASE2: { message: string } }>

  expectTypeOf(adapted.ping).toEqualTypeOf<
    ContractProcedure<
      typeof inputSchema,
      typeof outputSchema,
      MergedErrorMap<{ INVALID: { status: number }, BASE2: { message: string } }, typeof baseErrorMap>,
      BaseMeta
    >
  >()

  expectTypeOf(adapted.nested.ping).toEqualTypeOf<
    ContractProcedure<
      typeof inputSchema,
      typeof outputSchema,
      MergedErrorMap<{ INVALID: { status: number }, BASE2: { message: string } }, typeof baseErrorMap>,
      BaseMeta
    >
  >()

  expectTypeOf(adapted.pong).toEqualTypeOf<
    ContractProcedure<
      undefined,
      undefined,
      MergedErrorMap<{ INVALID: { status: number }, BASE2: { message: string } }, Record<never, never>>,
      Meta
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
