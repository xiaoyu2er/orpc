import type { ReadonlyDeep } from '@orpc/shared'
import type { MergedErrorMap, StrictErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { DecoratedContractProcedure } from './procedure-decorated'
import type { MergedRoute, PrefixedRoute, UnshiftedTagRoute } from './route-utils'
import { type baseErrorMap, type baseMeta, type BaseMetaDef, type baseRoute, inputSchema, type outputSchema } from '../tests/shared'

const builder = {} as ContractProcedureBuilderWithOutput<typeof outputSchema, typeof baseErrorMap, typeof baseRoute, BaseMetaDef, typeof baseMeta>

describe('DecoratedContractProcedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<undefined, typeof outputSchema, typeof baseErrorMap, typeof baseRoute, BaseMetaDef, typeof baseMeta>
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({ BAD_GATEWAY: { message: 'BAD_GATEWAY' } })).toEqualTypeOf<
      ContractProcedureBuilderWithOutput<
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
      ContractProcedureBuilderWithOutput<
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
      ContractProcedureBuilderWithOutput<
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

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/api')).toEqualTypeOf<
      ContractProcedureBuilderWithOutput<
        typeof outputSchema,
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
      ContractProcedureBuilderWithOutput<
        typeof outputSchema,
        typeof baseErrorMap,
        UnshiftedTagRoute<typeof baseRoute, ['tag', 'tag2']>,
        BaseMetaDef,
        typeof baseMeta
      >
    >()

    // @ts-expect-error - invalid tag
    builder.unshiftTag(1)
  })

  it('.input', () => {
    expectTypeOf(builder.input(inputSchema)).toEqualTypeOf<
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
