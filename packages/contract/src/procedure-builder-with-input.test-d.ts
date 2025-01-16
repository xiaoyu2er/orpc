import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
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

const inputSchema = z.object({ input: z.string().transform(v => Number.parseInt(v)) })

const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })

const builder = {} as ContractProcedureBuilderWithInput<typeof inputSchema, typeof baseErrorMap>

describe('DecoratedContractProcedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<ContractProcedure<typeof inputSchema, undefined, typeof baseErrorMap>>()
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: z.object({ message: z.string() }) } } as const

    expectTypeOf(builder.errors(errors))
      .toEqualTypeOf<ContractProcedureBuilderWithInput<typeof inputSchema, typeof baseErrorMap & typeof errors>>()

    // @ts-expect-error - not allow redefine error map
    builder.errors({ BASE: baseErrorMap.BASE })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<ContractProcedureBuilderWithInput<typeof inputSchema, typeof baseErrorMap>>()

    // @ts-expect-error - invalid method
    builder.route({ method: 'HE' })
  })

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/api')).toEqualTypeOf<ContractProcedureBuilderWithInput<typeof inputSchema, typeof baseErrorMap>>()

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
  })

  it('.unshiftTag', () => {
    expectTypeOf(builder.unshiftTag('tag', 'tag2')).toEqualTypeOf<ContractProcedureBuilderWithInput<typeof inputSchema, typeof baseErrorMap>>()

    // @ts-expect-error - invalid tag
    builder.unshiftTag(1)
  })

  it('.output', () => {
    expectTypeOf(builder.output(schema)).toEqualTypeOf<
      DecoratedContractProcedure<typeof inputSchema, typeof schema, typeof baseErrorMap>
    >()
  })
})
