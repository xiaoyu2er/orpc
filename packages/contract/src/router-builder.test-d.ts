import type { ReadonlyDeep } from '@orpc/shared'
import type { baseErrorMap, baseMeta, BaseMetaDef, outputSchema } from '../tests/shared'
import type { MergedErrorMap, StrictErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { ContractRouterBuilder } from './router-builder'
import type { AdaptedContractRouter } from './router-utils'
import { ping, pong } from '../tests/shared'

const builder = {} as ContractRouterBuilder<typeof baseErrorMap, '/api', ['api'], BaseMetaDef>

describe('ContractRouterBuilder', () => {
  it('.prefix', () => {
    expectTypeOf(builder.prefix('/api')).toEqualTypeOf<
      ContractRouterBuilder<typeof baseErrorMap, '/api/api', ['api'], BaseMetaDef>
    >()

    // @ts-expect-error - invalid prefix
    builder.prefix(123)
  })

  it('.tag', () => {
    expectTypeOf(builder.tag('tag', 'tag2')).toEqualTypeOf<
      ContractRouterBuilder<typeof baseErrorMap, '/api', ['api', 'tag', 'tag2'], BaseMetaDef>
    >()

    // @ts-expect-error - invalid tag
    builder.tag(123)
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({ INVALID: { message: 'INVALID' } })).toEqualTypeOf<
      ContractRouterBuilder<
        MergedErrorMap<typeof baseErrorMap, StrictErrorMap<ReadonlyDeep<{ INVALID: { message: 'INVALID' } }>>>,
        '/api',
        ['api'],
        BaseMetaDef
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.errors({ TOO_MANY_REQUESTS: { data: {} } })

    // @ts-expect-error - not allow redefine errorMap
    builder.errors({ BASE: baseErrorMap.BASE })
  })

  it('.router', () => {
    const router = {
      ping,
      pong,
    }

    expectTypeOf(builder.router(router)).toEqualTypeOf<
      AdaptedContractRouter<typeof router, typeof baseErrorMap, '/api', ['api']>
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
