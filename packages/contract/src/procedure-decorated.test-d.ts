import type { ReadonlyDeep } from '@orpc/shared'
import type { PrefixRoute, UnshiftTagRoute } from './route'
import { z } from 'zod'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'

const baseErrorMap = {
  BASE: {
    status: 500,
    data: z.object({
      message: z.string(),
    }),
  },
}

const InputSchema = z.object({ input: z.string().transform(val => Number(val)) })
const OutputSchema = z.object({ output: z.string().transform(val => Number(val)) })

const baseRoute = {
  path: '/api/v1/users',
} as const

const decorated = new DecoratedContractProcedure({ InputSchema, OutputSchema, errorMap: baseErrorMap, route: baseRoute })

describe('DecoratedContractProcedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(decorated).toMatchTypeOf<
      ContractProcedure<typeof InputSchema, typeof OutputSchema, typeof baseErrorMap, typeof baseRoute>
    >()
  })

  it('.decorate', () => {
    expectTypeOf(
      DecoratedContractProcedure.decorate(new ContractProcedure({ InputSchema, OutputSchema, errorMap: baseErrorMap, route: baseRoute })),
    ).toEqualTypeOf<
      DecoratedContractProcedure<typeof InputSchema, typeof OutputSchema, typeof baseErrorMap, typeof baseRoute>
    >()

    expectTypeOf(
      DecoratedContractProcedure.decorate(decorated),
    ).toEqualTypeOf<
      DecoratedContractProcedure<typeof InputSchema, typeof OutputSchema, typeof baseErrorMap, typeof baseRoute>
    >()
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: z.object({ message: z.string() }) } } as const

    expectTypeOf(decorated.errors(errors)).toEqualTypeOf<
      DecoratedContractProcedure<typeof InputSchema, typeof OutputSchema, typeof baseErrorMap & typeof errors, typeof baseRoute>
    >()

    // @ts-expect-error - not allow redefine error map
    decorated.errors({ BASE: baseErrorMap.BASE })
  })

  it('.route', () => {
    expectTypeOf(decorated.route({ method: 'GET' })).toEqualTypeOf<
      DecoratedContractProcedure<
        typeof InputSchema,
        typeof OutputSchema,
        typeof baseErrorMap,
        ReadonlyDeep<{ method: 'GET' }> & typeof baseRoute
      >
    >()

    // @ts-expect-error - invalid method
    decorated.route({ method: 'HE' })
  })

  it('.prefix', () => {
    expectTypeOf(decorated.prefix('/api')).toEqualTypeOf<
      DecoratedContractProcedure<
        typeof InputSchema,
        typeof OutputSchema,
        typeof baseErrorMap,
        PrefixRoute<typeof baseRoute, '/api'>
      >
    >()

    // @ts-expect-error - invalid prefix
    decorated.prefix(1)
  })

  it('.unshiftTag', () => {
    expectTypeOf(decorated.unshiftTag('tag', 'tag2')).toEqualTypeOf<
      DecoratedContractProcedure<
        typeof InputSchema,
        typeof OutputSchema,
        typeof baseErrorMap,
        UnshiftTagRoute<typeof baseRoute, ['tag', 'tag2']>
      >
    >()

    // @ts-expect-error - invalid tag
    decorated.unshiftTag(1)
  })
})
