import type { ReadonlyDeep } from '@orpc/shared'
import type { baseMeta, BaseMetaDef, baseRoute } from '../tests/shared'
import type { MergedErrorMap, StrictErrorMap } from './error-map'
import type { MergedMeta } from './meta'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilder } from './procedure-builder'
import type { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { MergedRoute, PrefixedRoute, UnshiftedTagRoute } from './route'
import { z } from 'zod'
import { baseErrorMap, inputSchema, outputSchema } from '../tests/shared'

const builder = {} as ContractProcedureBuilder<typeof baseErrorMap, typeof baseRoute, BaseMetaDef, typeof baseMeta>

describe('DecoratedContractProcedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<undefined, undefined, typeof baseErrorMap, typeof baseRoute, BaseMetaDef, typeof baseMeta>
    >()
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: z.object({ message: z.string() }) } } as const

    expectTypeOf(builder.errors(errors)).toEqualTypeOf<
      ContractProcedureBuilder<
        MergedErrorMap<typeof baseErrorMap, StrictErrorMap<typeof errors>>,
        typeof baseRoute,
        BaseMetaDef,
        typeof baseMeta
      >
    >()

    // @ts-expect-error - invalid schema
    builder.errors({ INVALID: { data: {} } })

    // @ts-expect-error - not allow redefine error map
    builder.errors({ BASE: baseErrorMap.BASE })
  })

  it('.meta', () => {
    expectTypeOf(builder.meta({ log: true })).toEqualTypeOf<
      ContractProcedureBuilder<
        typeof baseErrorMap,
        typeof baseRoute,
        BaseMetaDef,
        MergedMeta<typeof baseMeta, ReadonlyDeep<{ log: true }>>
      >
    >()

    // @ts-expect-error - invalid method
    builder.meta({ log: 'INVALID' })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<
      ContractProcedureBuilder<
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
      ContractProcedureBuilder<
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
      ContractProcedureBuilder<
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
      ContractProcedureBuilderWithInput<
        typeof inputSchema,
        typeof baseErrorMap,
        typeof baseRoute,
        BaseMetaDef,
        typeof baseMeta
      >
    >()

    // @ts-expect-error - invalid schema
    builder.input({})
  })

  it('.output', () => {
    expectTypeOf(builder.output(outputSchema)).toEqualTypeOf<
      ContractProcedureBuilderWithOutput<
        typeof outputSchema,
        typeof baseErrorMap,
        typeof baseRoute,
        BaseMetaDef,
        typeof baseMeta
      >
    >()

    // @ts-expect-error - invalid schema
    builder.output({})
  })
})
