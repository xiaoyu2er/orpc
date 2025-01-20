import type { ReadonlyDeep } from '@orpc/shared'
import type { StrictErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilder } from './procedure-builder'
import type { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
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

const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })

type BaseRoute = { path: '/base' }

const builder = {} as ContractProcedureBuilder<typeof baseErrorMap, BaseRoute>

describe('DecoratedContractProcedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<ContractProcedure<undefined, undefined, typeof baseErrorMap, BaseRoute>>()
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: z.object({ message: z.string() }) } } as const

    expectTypeOf(builder.errors(errors))
      .toEqualTypeOf < ContractProcedureBuilder<typeof baseErrorMap & StrictErrorMap<typeof errors>, BaseRoute>>()

    // @ts-expect-error - not allow redefine error map
    builder.errors({ BASE: baseErrorMap.BASE })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<
      ContractProcedureBuilder<
        typeof baseErrorMap,
        ReadonlyDeep<{ method: 'GET' }> & BaseRoute
      >
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'HE' })
  })

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/api')).toEqualTypeOf<
      ContractProcedureBuilder<typeof baseErrorMap, PrefixRoute<BaseRoute, '/api'>>
    >()

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
  })

  it('.unshiftTag', () => {
    expectTypeOf(builder.unshiftTag('tag', 'tag2')).toEqualTypeOf<
      ContractProcedureBuilder<typeof baseErrorMap, UnshiftTagRoute<BaseRoute, ['tag', 'tag2']>>
    >()

    // @ts-expect-error - invalid tag
    builder.unshiftTag(1)
  })

  it('.input', () => {
    expectTypeOf(builder.input(schema)).toEqualTypeOf<
      ContractProcedureBuilderWithInput<typeof schema, typeof baseErrorMap, BaseRoute>
    >()
  })

  it('.output', () => {
    expectTypeOf(builder.output(schema)).toEqualTypeOf<
      ContractProcedureBuilderWithOutput<typeof schema, typeof baseErrorMap, BaseRoute>
    >()
  })
})
