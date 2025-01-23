import type { ReadonlyDeep } from '@orpc/shared'
import type { baseMeta, BaseMetaDef, baseRoute, inputSchema, outputSchema } from '../tests/shared'
import type { MergedErrorMap, StrictErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { DecoratedContractProcedure } from './procedure-decorated'
import type { MergedRoute } from './route-utils'
import { baseErrorMap } from '../tests/shared'

const builder = {} as DecoratedContractProcedure<
  typeof inputSchema,
  typeof outputSchema,
  typeof baseErrorMap,
  typeof baseRoute,
  BaseMetaDef,
  typeof baseMeta
>

describe('DecoratedContractProcedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<typeof inputSchema, typeof outputSchema, typeof baseErrorMap, typeof baseRoute, BaseMetaDef, typeof baseMeta>
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({ BAD_GATEWAY: { message: 'BAD_GATEWAY' } })).toEqualTypeOf<
      DecoratedContractProcedure<
        typeof inputSchema,
        typeof outputSchema,
        MergedErrorMap<typeof baseErrorMap, StrictErrorMap<ReadonlyDeep<{ BAD_GATEWAY: { message: 'BAD_GATEWAY' } }>>>,
        typeof baseRoute,
        BaseMetaDef,
        typeof baseMeta
      >
    >()

    // @ts-expect-error - invalid schema
    builder.errors({ BAD_GATEWAY: { data: {} } })
    // @ts-expect-error - not allow redefine error map
    builder.errors({ BASE: baseErrorMap.BASE })
  })

  it('.meta', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<
      DecoratedContractProcedure<
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        MergedRoute<typeof baseRoute, ReadonlyDeep<{ method: 'GET' }>>,
        BaseMetaDef,
        typeof baseMeta
      >
    >()

    // @ts-expect-error - invalid method
    builder.meta({ log: 'INVALID' })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<
      DecoratedContractProcedure<
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        MergedRoute<typeof baseRoute, ReadonlyDeep<{ method: 'GET' }>>,
        BaseMetaDef,
        typeof baseMeta
      >
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'INVALID' })
  })
})
