import type { baseErrorMap, BaseMeta, inputSchema } from '../tests/shared'
import type { MergedErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { DecoratedContractProcedure } from './procedure-decorated'
import { outputSchema } from '../tests/shared'

const builder = {} as ContractProcedureBuilderWithInput<
  typeof inputSchema,
  typeof baseErrorMap,
  BaseMeta
>

describe('DecoratedContractProcedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<typeof inputSchema, undefined, typeof baseErrorMap, BaseMeta>
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({
      BAD_GATEWAY: { message: 'BAD_GATEWAY' },
      OVERRIDE: { message: 'OVERRIDE' },
    })).toEqualTypeOf<
      ContractProcedureBuilderWithInput<
        typeof inputSchema,
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

  it('.output', () => {
    expectTypeOf(builder.output(outputSchema)).toEqualTypeOf<
      DecoratedContractProcedure<
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()
  })
})
