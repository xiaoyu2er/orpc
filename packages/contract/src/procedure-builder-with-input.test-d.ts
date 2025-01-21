import type { ReadonlyDeep } from '@orpc/shared'
import type { baseMeta, BaseMetaDef, baseRoute, inputSchema } from '../tests/shared'
import type { MergedErrorMap, StrictErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { DecoratedContractProcedure } from './procedure-decorated'
import type { MergedRoute, PrefixedRoute, UnshiftedTagRoute } from './route-utils'
import { baseErrorMap, outputSchema } from '../tests/shared'

const builder = {} as ContractProcedureBuilderWithInput<
  typeof inputSchema,
  typeof baseErrorMap,
  typeof baseRoute,
  BaseMetaDef,
  typeof baseMeta
>

describe('DecoratedContractProcedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<typeof inputSchema, undefined, typeof baseErrorMap, typeof baseRoute, BaseMetaDef, typeof baseMeta>
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({ BAD_GATEWAY: { message: 'BAD_GATEWAY' } })).toEqualTypeOf<
      ContractProcedureBuilderWithInput<
        typeof inputSchema,
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
      ContractProcedureBuilderWithInput<
        typeof inputSchema,
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
      ContractProcedureBuilderWithInput<
        typeof inputSchema,
        typeof baseErrorMap,
        MergedRoute<typeof baseRoute, ReadonlyDeep<{ method: 'GET' }>>,
        BaseMetaDef,
        typeof baseMeta
      >
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'INVALID' })
  })

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/api')).toEqualTypeOf<
      ContractProcedureBuilderWithInput<
        typeof inputSchema,
        typeof baseErrorMap,
        PrefixedRoute<typeof baseRoute, '/api'>,
        BaseMetaDef,
        typeof baseMeta
      >
    >()

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
  })

  it('.unshiftTag', () => {
    expectTypeOf(builder.unshiftTag('tag', 'tag2')).toEqualTypeOf<
      ContractProcedureBuilderWithInput<
        typeof inputSchema,
        typeof baseErrorMap,
        UnshiftedTagRoute<typeof baseRoute, ['tag', 'tag2']>,
        BaseMetaDef,
        typeof baseMeta
      >
    >()

    // @ts-expect-error - invalid tag
    builder.unshiftTag(1)
  })

  it('.output', () => {
    expectTypeOf(builder.output(outputSchema)).toEqualTypeOf<
      DecoratedContractProcedure<
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        typeof baseRoute,
        BaseMetaDef,
        typeof baseMeta
      >
    >()
  })
})
