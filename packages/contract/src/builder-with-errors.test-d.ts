import type { ReadonlyDeep } from '@orpc/shared'
import type { ContractBuilderWithErrors } from './builder-with-errors'
import type { MergedErrorMap, StrictErrorMap } from './error-map'
import type { MergedMeta } from './meta'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilder } from './procedure-builder'
import type { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { MergedRoute } from './route'
import type { AdaptedContractRouter } from './router'
import type { ContractRouterBuilder } from './router-builder'
import { baseErrorMap, type baseMeta, type BaseMetaDef, type baseRoute, inputSchema, outputSchema, ping, pong } from '../tests/shared'

const builder = {} as ContractBuilderWithErrors<typeof baseErrorMap, typeof baseRoute, BaseMetaDef, typeof baseMeta>

describe('ContractBuilder', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<
        undefined,
        undefined,
        typeof baseErrorMap,
        typeof baseRoute,
        BaseMetaDef,
        typeof baseMeta
      >
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({ INVALID: { message: 'INVALID' } })).toEqualTypeOf<
      ContractBuilderWithErrors<
        MergedErrorMap<typeof baseErrorMap, StrictErrorMap<ReadonlyDeep<{ INVALID: { message: 'INVALID' } }>>>,
        typeof baseRoute,
        BaseMetaDef,
        typeof baseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.errors({ TOO_MANY_REQUESTS: { data: {} } })

    // @ts-expect-error - not allow redefine errorMap
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

    // @ts-expect-error - invalid meta
    builder.meta({ meta: 'INVALID' })
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

    // @ts-expect-error - schema is invalid
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

    // @ts-expect-error - schema is invalid
    builder.output({})
  })

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/api')).toEqualTypeOf<
      ContractRouterBuilder<typeof baseErrorMap, '/api', undefined, BaseMetaDef>
    >()

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
  })

  it('.tag', () => {
    expectTypeOf(builder.tag('tag1', 'tag2')).toEqualTypeOf<
      ContractRouterBuilder<typeof baseErrorMap, undefined, ['tag1', 'tag2'], BaseMetaDef>
    >()

    // @ts-expect-error - invalid tag
    builder.tag(1)
  })

  it('.router', () => {
    const router = {
      ping,
      pong,
    }

    expectTypeOf(builder.router(router)).toEqualTypeOf<
      AdaptedContractRouter<typeof router, typeof baseErrorMap, undefined, undefined>
    >()

    // @ts-expect-error - invalid router
    builder.router(123)

    builder.router({
      // @ts-expect-error - conflict error map
      ping: {} as ContractProcedure<
        undefined,
            typeof outputSchema,
            { BASE: { message: string } },
            { description: string },
            BaseMetaDef,
            typeof baseMeta
      >,
    })

    builder.router({
      // @ts-expect-error - conflict meta def
      ping: {} as ContractProcedure<
        undefined,
          typeof outputSchema,
          typeof baseErrorMap,
          { description: string },
          { mode?: number },
          { mode: 123 }
      >,
    })
  })
})
