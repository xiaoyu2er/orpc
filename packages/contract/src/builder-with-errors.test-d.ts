import type { baseErrorMap, BaseMeta } from '../tests/shared'
import type { ContractBuilderWithErrors } from './builder-with-errors'
import type { MergedErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilder } from './procedure-builder'
import type { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { AdaptedContractRouter } from './router'
import type { ContractRouterBuilder } from './router-builder'
import { inputSchema, outputSchema, ping, pong } from '../tests/shared'

const builder = {} as ContractBuilderWithErrors<typeof baseErrorMap, BaseMeta>

describe('ContractBuilder', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<
        undefined,
        undefined,
        typeof baseErrorMap,
        BaseMeta
      >
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({
      INVALID: { message: 'INVALID' },
      OVERRIDE: { message: 'OVERRIDE' },
    })).toEqualTypeOf<
      ContractBuilderWithErrors<
        MergedErrorMap<typeof baseErrorMap, { INVALID: { message: string }, OVERRIDE: { message: string } }>,
        BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.errors({ TOO_MANY_REQUESTS: { data: {} } })
  })

  it('.meta', () => {
    expectTypeOf(builder.meta({ log: true })).toEqualTypeOf<
      ContractProcedureBuilder<typeof baseErrorMap, BaseMeta>
    >()

    // @ts-expect-error - invalid meta
    builder.meta({ meta: 'INVALID' })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<
      ContractProcedureBuilder<typeof baseErrorMap, BaseMeta>
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'INVALID' })
  })

  it('.input', () => {
    expectTypeOf(builder.input(inputSchema)).toEqualTypeOf<
      ContractProcedureBuilderWithInput<
        typeof inputSchema,
        typeof baseErrorMap,
        BaseMeta
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
        BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.output({})
  })

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/api')).toEqualTypeOf<
      ContractRouterBuilder<typeof baseErrorMap, BaseMeta>
    >()

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
  })

  it('.tag', () => {
    expectTypeOf(builder.tag('tag1', 'tag2')).toEqualTypeOf<
      ContractRouterBuilder<typeof baseErrorMap, BaseMeta>
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
      AdaptedContractRouter<typeof router, typeof baseErrorMap>
    >()

    // @ts-expect-error - invalid router
    builder.router(123)

    builder.router({
      // @ts-expect-error - conflict meta def
      ping: {} as ContractProcedure<
        undefined,
          typeof outputSchema,
          typeof baseErrorMap,
          { invalid: true }
      >,
    })
  })
})
