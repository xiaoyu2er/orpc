import type { baseErrorMap, BaseMeta } from '../tests/shared'
import type { MergedErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilder } from './procedure-builder'
import type { ContractProcedureBuilderWithoutInputMethods, ContractProcedureBuilderWithoutOutputMethods } from './procedure-builder-variants'
import { inputSchema, outputSchema } from '../tests/shared'

const builder = {} as ContractProcedureBuilder<
  typeof inputSchema,
  typeof outputSchema,
  typeof baseErrorMap,
  BaseMeta
>

describe('DecoratedContractProcedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<typeof inputSchema, typeof outputSchema, typeof baseErrorMap, BaseMeta>
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({
      BAD_GATEWAY: { message: 'BAD_GATEWAY' },
      OVERRIDE: { message: 'OVERRIDE' },
    })).toEqualTypeOf<
      ContractProcedureBuilder<
        typeof inputSchema,
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
      ContractProcedureBuilderWithoutInputMethods<
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.input({})
  })

  it('.output', () => {
    expectTypeOf(builder.output(outputSchema)).toEqualTypeOf<
      ContractProcedureBuilderWithoutOutputMethods<
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.output({})
  })
})
