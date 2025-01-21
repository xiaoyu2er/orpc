import type { baseErrorMap, baseMeta, BaseMetaDef, outputSchema } from '../tests/shared'
import type { ErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { ContractRouter } from './router'
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
