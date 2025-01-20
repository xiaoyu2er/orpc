import type { ReadonlyDeep } from '@orpc/shared'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { DecoratedContractProcedure } from './procedure-decorated'
import type { PrefixRoute, UnshiftTagRoute } from './route'
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

type BaseRoute = { path: '/base' }

const builder = {} as ContractProcedureBuilderWithInput<typeof inputSchema, typeof baseErrorMap, BaseRoute>

describe('DecoratedContractProcedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<ContractProcedure<typeof inputSchema, undefined, typeof baseErrorMap, BaseRoute>>()
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: z.object({ message: z.string() }) } } as const

    expectTypeOf(builder.errors(errors))
      .toEqualTypeOf<
      ContractProcedureBuilderWithInput<typeof inputSchema, typeof baseErrorMap & typeof errors, BaseRoute>
    >()

    // @ts-expect-error - not allow redefine error map
    builder.errors({ BASE: baseErrorMap.BASE })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET', tags: ['tag'] })).toEqualTypeOf<
      ContractProcedureBuilderWithInput<
      typeof inputSchema,
      typeof baseErrorMap,
      ReadonlyDeep<{ method: 'GET', tags: ['tag'] }> & BaseRoute
      >
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'HE' })
  })

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/api')).toEqualTypeOf<
      ContractProcedureBuilderWithInput<
      typeof inputSchema,
      typeof baseErrorMap,
      PrefixRoute<BaseRoute, '/api'>
      >
    >()

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
  })

  it('.unshiftTag', () => {
    expectTypeOf(builder.unshiftTag('tag', 'tag2')).toEqualTypeOf<
      ContractProcedureBuilderWithInput<
      typeof inputSchema,
      typeof baseErrorMap,
      UnshiftTagRoute<BaseRoute, ['tag', 'tag2']>
      >
    >()

    // @ts-expect-error - invalid tag
    builder.unshiftTag(1)
  })

  it('.output', () => {
    expectTypeOf(builder.output(schema)).toEqualTypeOf<
      DecoratedContractProcedure<typeof inputSchema, typeof schema, typeof baseErrorMap, BaseRoute>
    >()
  })
})
