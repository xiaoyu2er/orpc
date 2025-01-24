import type { baseErrorMap, BaseMeta } from '../tests/shared'
import type { MergedErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilder } from './procedure-builder'
import type { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { z } from 'zod'
import { inputSchema, outputSchema } from '../tests/shared'

const builder = {} as ContractProcedureBuilder<typeof baseErrorMap, BaseMeta>

describe('DecoratedContractProcedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<undefined, undefined, typeof baseErrorMap, BaseMeta>
    >()
  })

  it('.errors', () => {
    const errors = {
      BAD_GATEWAY: { data: z.object({ message: z.string() }) },
      OVERRIDE: { data: z.object({ message: z.string() }) },
    }

    expectTypeOf(builder.errors(errors)).toEqualTypeOf<
      ContractProcedureBuilder<
        MergedErrorMap<typeof baseErrorMap, typeof errors>,
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid schema
    builder.errors({ INVALID: { data: {} } })
  })

  it('.meta', () => {
    expectTypeOf(builder.meta({ log: true })).toEqualTypeOf<
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
      ContractProcedureBuilderWithInput<
        typeof inputSchema,
        typeof baseErrorMap,
        BaseMeta
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
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid schema
    builder.output({})
  })
})
