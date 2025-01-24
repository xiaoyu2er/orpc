import type { MergedErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { DecoratedContractProcedure } from './procedure-decorated'
import { type baseErrorMap, type BaseMeta, inputSchema, type outputSchema } from '../tests/shared'

const builder = {} as ContractProcedureBuilderWithOutput<typeof outputSchema, typeof baseErrorMap, BaseMeta>

describe('DecoratedContractProcedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<undefined, typeof outputSchema, typeof baseErrorMap, BaseMeta>
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({
      BAD_GATEWAY: { message: 'BAD_GATEWAY' },
      OVERRIDE: { message: 'OVERRIDE' },
    })).toEqualTypeOf<
      ContractProcedureBuilderWithOutput<
        typeof outputSchema,
        MergedErrorMap<typeof baseErrorMap, { BAD_GATEWAY: { message: string }, OVERRIDE: { message: string } }>,
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid schema
    builder.errors({ BAD_GATEWAY: { data: {} } })
  })

  it('.meta', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<
      typeof builder
    >()

    // @ts-expect-error - invalid method
    builder.meta({ log: 'INVALID' })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<
      typeof builder
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'INVALID' })
  })

  it('.input', () => {
    expectTypeOf(builder.input(inputSchema)).toEqualTypeOf<
      DecoratedContractProcedure<
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()
  })
})
