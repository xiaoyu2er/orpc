import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { DecoratedContractProcedure } from './procedure-decorated'
import { z } from 'zod'

const baseErrorMap = {
  BASE: {
    status: 500,
    data: z.object({
      message: z.string(),
    }),
  },
}

const outputSchema = z.object({ input: z.string().transform(v => Number.parseInt(v)) })

const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })

const builder = {} as ContractProcedureBuilderWithOutput<typeof outputSchema, typeof baseErrorMap>

describe('DecoratedContractProcedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<ContractProcedure<undefined, typeof outputSchema, typeof baseErrorMap>>()
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: z.object({ message: z.string() }) } } as const

    expectTypeOf(builder.errors(errors))
      .toEqualTypeOf<ContractProcedureBuilderWithOutput<typeof outputSchema, typeof baseErrorMap & typeof errors>>()

    // @ts-expect-error - not allow redefine error map
    builder.errors({ BASE: baseErrorMap.BASE })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<ContractProcedureBuilderWithOutput<typeof outputSchema, typeof baseErrorMap>>()

    // @ts-expect-error - invalid method
    builder.route({ method: 'HE' })
  })

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/api')).toEqualTypeOf<ContractProcedureBuilderWithOutput<typeof outputSchema, typeof baseErrorMap>>()

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
  })

  it('.unshiftTag', () => {
    expectTypeOf(builder.unshiftTag('tag', 'tag2')).toEqualTypeOf<ContractProcedureBuilderWithOutput<typeof outputSchema, typeof baseErrorMap>>()

    // @ts-expect-error - invalid tag
    builder.unshiftTag(1)
  })

  it('.input', () => {
    expectTypeOf(builder.input(schema)).toEqualTypeOf<
      DecoratedContractProcedure<typeof schema, typeof outputSchema, typeof baseErrorMap>
    >()
  })
})
