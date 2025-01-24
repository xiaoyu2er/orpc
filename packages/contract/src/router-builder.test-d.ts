import type { baseErrorMap, BaseMeta, outputSchema } from '../tests/shared'
import type { MergedErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { AdaptedContractRouter } from './router'
import type { ContractRouterBuilder } from './router-builder'
import { ping, pong } from '../tests/shared'

const builder = {} as ContractRouterBuilder<typeof baseErrorMap, BaseMeta>

describe('ContractRouterBuilder', () => {
  it('.prefix', () => {
    expectTypeOf(builder.prefix('/api')).toEqualTypeOf<
      typeof builder
    >()

    // @ts-expect-error - invalid prefix
    builder.prefix(123)
  })

  it('.tag', () => {
    expectTypeOf(builder.tag('tag', 'tag2')).toEqualTypeOf<
      typeof builder
    >()

    // @ts-expect-error - invalid tag
    builder.tag(123)
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({ INVALID: { message: 'INVALID' } })).toEqualTypeOf<
      ContractRouterBuilder<
        MergedErrorMap<typeof baseErrorMap, { INVALID: { message: string } }>,
        BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.errors({ TOO_MANY_REQUESTS: { data: {} } })
  })

  it('.router', () => {
    const router = {
      ping,
      pong,
    }

    expectTypeOf(builder.router(router)).toEqualTypeOf<
      AdaptedContractRouter<typeof router, typeof baseErrorMap>
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
        BaseMeta,
        BaseMeta
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
