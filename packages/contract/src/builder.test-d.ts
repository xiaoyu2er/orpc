import type { ReadonlyDeep } from '@orpc/shared'
import type { ContractBuilder } from './builder'
import type { ContractBuilderWithErrors } from './builder-with-errors'
import type { MergedMeta, StrictMeta } from './meta-utils'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilder } from './procedure-builder'
import type { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { MergedRoute, StrictRoute } from './route-utils'
import type { ContractRouterBuilder } from './router-builder'
import { baseErrorMap, type baseMeta, type BaseMetaDef, type baseRoute, inputSchema, outputSchema, ping, pong } from '../tests/shared'

const builder = {} as ContractBuilder<typeof baseRoute, BaseMetaDef, typeof baseMeta>

describe('ContractBuilder', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<
        undefined,
        undefined,
        Record<never, never>,
        typeof baseRoute,
        BaseMetaDef,
        typeof baseMeta
      >
    >()
  })

  it('.$meta', () => {
    type MetaDef = { meta1?: string, meta2?: number }

    expectTypeOf(builder.$meta<MetaDef, { meta1: 'value' }>({ meta1: 'value' })).toEqualTypeOf<
      ContractBuilder<
        typeof baseRoute,
        MetaDef,
        StrictMeta<MetaDef, { meta1: 'value' }>
      >
    >()

    // @ts-expect-error - initial meta is not match
    builder.$meta<MetaDef, { meta1: 'value' }>({ meta1: 'value2' })

    // @ts-expect-error - number is not satisfied meta
    builder.$meta<number, { meta1: 'value' }>({ meta1: 'value' })
  })

  it('.$route', () => {
    expectTypeOf(builder.$route({ method: 'GET', path: '/api' })).toEqualTypeOf<
      ContractBuilder<
        StrictRoute<ReadonlyDeep<{ method: 'GET', path: '/api' }>>,
        BaseMetaDef,
        typeof baseMeta
      >
    >()

    // @ts-expect-error - method is invalid
    builder.$route({ method: 'INVALID' })
  })

  it('.errors', () => {
    expectTypeOf(builder.errors(baseErrorMap))
      .toEqualTypeOf<ContractBuilderWithErrors<typeof baseErrorMap, typeof baseRoute, BaseMetaDef, typeof baseMeta>>()

    // @ts-expect-error - schema is invalid
    builder.errors({ TOO_MANY_REQUESTS: { data: {} } })
  })

  it('.meta', () => {
    expectTypeOf(builder.meta({ log: true })).toEqualTypeOf<
      ContractProcedureBuilder<
        Record<never, never>,
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
        Record<never, never>,
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
        Record<never, never>,
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
        Record<never, never>,
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
      ContractRouterBuilder<Record<never, never>, '/api', undefined, BaseMetaDef>
    >()

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
  })

  it('.tag', () => {
    expectTypeOf(builder.tag('tag1', 'tag2')).toEqualTypeOf<
      ContractRouterBuilder<Record<never, never>, undefined, ['tag1', 'tag2'], BaseMetaDef>
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
        typeof router
    >()

    // @ts-expect-error - invalid router
    builder.router(123)

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
