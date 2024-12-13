import type { DecoratedContractProcedure } from './procedure-decorated'
import type { ContractRouterBuilder } from './router-builder'
import { z } from 'zod'
import { ContractBuilder } from './builder'
import { ContractProcedure } from './procedure'

const builder = new ContractBuilder()

describe('to ContractRouterBuilder', () => {
  it('prefix', () => {
    expectTypeOf(builder.prefix('/prefix')).toEqualTypeOf<
      ContractRouterBuilder
    >()

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
    // @ts-expect-error - invalid prefix
    builder.prefix('')
  })

  it('tags', () => {
    expectTypeOf(builder.tag('tag1', 'tag2')).toEqualTypeOf<
      ContractRouterBuilder
    >()

    // @ts-expect-error - invalid tag
    builder.tag(1)
    // @ts-expect-error - invalid tag
    builder.tag({})
  })
})

describe('to DecoratedContractProcedure', () => {
  it('route', () => {
    expectTypeOf(builder.route({ method: 'GET', path: '/path' })).toEqualTypeOf<
      DecoratedContractProcedure<undefined, undefined>
    >()

    expectTypeOf(builder.route({ })).toEqualTypeOf<
      DecoratedContractProcedure<undefined, undefined>
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'HE' })
    // @ts-expect-error - invalid path
    builder.route({ method: 'GET', path: '' })
  })

  const schema = z.object({
    value: z.string(),
  })

  it('input', () => {
    expectTypeOf(builder.input(schema)).toEqualTypeOf<
      DecoratedContractProcedure<typeof schema, undefined>
    >()

    expectTypeOf(builder.input(schema, { value: 'example' })).toEqualTypeOf<
      DecoratedContractProcedure<typeof schema, undefined>
    >()

    // @ts-expect-error - invalid schema
    builder.input({})

    // @ts-expect-error - invalid example
    builder.input(schema, { })
  })

  it('output', () => {
    expectTypeOf(builder.output(schema)).toEqualTypeOf<
      DecoratedContractProcedure<undefined, typeof schema>
    >()

    expectTypeOf(builder.output(schema, { value: 'example' })).toEqualTypeOf<
      DecoratedContractProcedure<undefined, typeof schema>
    >()

    // @ts-expect-error - invalid schema
    builder.output({})

    // @ts-expect-error - invalid example
    builder.output(schema, {})
  })
})

describe('to router', () => {
  const router = {
    a: {
      b: {
        c: new ContractProcedure({ InputSchema: undefined, OutputSchema: undefined }),
      },
    },
  }

  const emptyRouter = {

  }

  const invalidRouter = {
    a: 1,
  }

  it('router', () => {
    expectTypeOf(builder.router(router)).toEqualTypeOf<typeof router>()
    expectTypeOf(builder.router(emptyRouter)).toEqualTypeOf<typeof emptyRouter>()

    // @ts-expect-error - invalid router
    builder.router(invalidRouter)
  })
})
