import type { DecoratedContractProcedure } from './procedure-decorated'
import type { AdaptedContractRouter, ContractRouterBuilder } from './router-builder'
import { z } from 'zod'
import { ContractBuilder } from './builder'
import { ContractProcedure } from './procedure'

const schema = z.object({
  value: z.string(),
})

const baseErrorMap = {
  BASE: {
    status: 500,
    data: z.object({
      message: z.string(),
    }),
  },
}

const builder = new ContractBuilder({ errorMap: baseErrorMap, OutputSchema: undefined, InputSchema: undefined })

it('also is a contract procedure', () => {
  expectTypeOf(builder).toMatchTypeOf<ContractProcedure<undefined, undefined, typeof baseErrorMap>>()
})

describe('self chainable', () => {
  describe('errors', () => {
    const errors = {
      BAD: {
        status: 500,
        data: schema,
      },
      ERROR2: {
        status: 401,
        data: schema,
      },
    } as const

    it('should merge and strict with old one', () => {
      expectTypeOf(builder.errors(errors)).toEqualTypeOf<
        ContractBuilder<typeof errors & typeof baseErrorMap>
      >()
    })

    it('should prevent redefine errorMap', () => {
      // @ts-expect-error - not allow redefine errorMap
      builder.errors({ BASE: baseErrorMap.BASE })
      // @ts-expect-error - not allow redefine errorMap - even with undefined
      builder.errors({ BASE: undefined })
    })
  })
})

describe('to ContractRouterBuilder', () => {
  it('prefix', () => {
    expectTypeOf(builder.prefix('/prefix')).toEqualTypeOf<
      ContractRouterBuilder<typeof baseErrorMap>
    >()

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
    // @ts-expect-error - invalid prefix
    builder.prefix('')
  })

  it('tags', () => {
    expectTypeOf(builder.tag('tag1', 'tag2')).toEqualTypeOf<
      ContractRouterBuilder<typeof baseErrorMap>
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
      DecoratedContractProcedure<undefined, undefined, typeof baseErrorMap>
    >()

    expectTypeOf(builder.route({ })).toEqualTypeOf<
      DecoratedContractProcedure<undefined, undefined, typeof baseErrorMap>
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'HE' })
    // @ts-expect-error - invalid path
    builder.route({ method: 'GET', path: '' })
  })

  it('input', () => {
    expectTypeOf(builder.input(schema)).toEqualTypeOf<
      DecoratedContractProcedure<typeof schema, undefined, typeof baseErrorMap>
    >()

    expectTypeOf(builder.input(schema, { value: 'example' })).toEqualTypeOf<
      DecoratedContractProcedure<typeof schema, undefined, typeof baseErrorMap>
    >()

    // @ts-expect-error - invalid schema
    builder.input({})

    // @ts-expect-error - invalid example
    builder.input(schema, { })
  })

  it('output', () => {
    expectTypeOf(builder.output(schema)).toEqualTypeOf<
      DecoratedContractProcedure<undefined, typeof schema, typeof baseErrorMap>
    >()

    expectTypeOf(builder.output(schema, { value: 'example' })).toEqualTypeOf<
      DecoratedContractProcedure<undefined, typeof schema, typeof baseErrorMap>
    >()

    // @ts-expect-error - invalid schema
    builder.output({})

    // @ts-expect-error - invalid example
    builder.output(schema, {})
  })
})

describe('to router', () => {
  const errors = {
    CONFLICT: {
      status: 400,
      data: z.object({
        message: z.string(),
      }),
    },
  }

  const router = { a: { b: {
    c: new ContractProcedure({ InputSchema: undefined, OutputSchema: undefined, errorMap: errors }),
  } } }

  it('adapt all procedures', () => {
    expectTypeOf(builder.router(router)).toEqualTypeOf<AdaptedContractRouter<typeof router, typeof baseErrorMap>>()
    expectTypeOf(builder.router({})).toEqualTypeOf<Record<never, never>>()

    // @ts-expect-error - invalid router
    builder.router({ a: 1 })
  })

  it('throw on conflict error map', () => {
    builder.router({ ping: {} as ContractProcedure<any, any, { BASE: typeof baseErrorMap['BASE'] }> })
    // @ts-expect-error conflict
    builder.router({ ping: {} as ContractProcedure<any, any, { BASE: { message: string } }> })
  })

  it('only required partial match error map', () => {
    expectTypeOf(builder.router({ ping: {} as ContractProcedure<any, any, { OTHER: { status: number } }> })).toEqualTypeOf<{
      ping: DecoratedContractProcedure<any, any, { OTHER: { status: number } } & typeof baseErrorMap>
    }>()
  })
})
