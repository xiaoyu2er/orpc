import { z } from 'zod'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'

const decorated = new DecoratedContractProcedure({ InputSchema: undefined, OutputSchema: undefined, errorMap: {} })

describe('decorate', () => {
  const schema = z.object({
    value: z.string(),
  })

  it('works', () => {
    const simpleProcedure = new ContractProcedure({ InputSchema: schema, OutputSchema: undefined, errorMap: {} })

    expectTypeOf(DecoratedContractProcedure.decorate(simpleProcedure)).toEqualTypeOf<
      DecoratedContractProcedure<typeof schema, undefined, Record<never, never>>
    >()

    expectTypeOf(DecoratedContractProcedure.decorate(decorated)).toEqualTypeOf<
      DecoratedContractProcedure<undefined, undefined, Record<never, never>>
    >()
  })
})

describe('route', () => {
  it('return ContractProcedure', () => {
    const routed = decorated.route({})
    expectTypeOf(routed).toEqualTypeOf<DecoratedContractProcedure<undefined, undefined, Record<never, never>>>()
  })

  it('throw error on invalid route', () => {
    decorated.route({ method: 'POST' })
    // @ts-expect-error - invalid method
    decorated.route({ method: 'HE' })

    decorated.route({ method: 'GET', path: '/api/v1/users' })
    // @ts-expect-error - invalid path
    decorated.route({ method: 'GET', path: '' })
  })
})

describe('prefix', () => {
  it('return ContractProcedure', () => {
    const prefixed = decorated.prefix('/api')
    expectTypeOf(prefixed).toEqualTypeOf<DecoratedContractProcedure<undefined, undefined, Record<never, never>>>()
  })

  it('throw error on invalid prefix', () => {
    decorated.prefix('/api')
    // @ts-expect-error - invalid prefix
    decorated.prefix(1)
    // @ts-expect-error - invalid prefix
    decorated.prefix('')
  })
})

describe('pushTag', () => {
  it('return ContractProcedure', () => {
    const tagged = decorated.unshiftTag('tag', 'tag2')
    expectTypeOf(tagged).toEqualTypeOf<DecoratedContractProcedure<undefined, undefined, Record<never, never>>>()
  })

  it('throw error on invalid tag', () => {
    decorated.unshiftTag('tag')
    decorated.unshiftTag('tag', 'tag2')
    // @ts-expect-error - invalid tag
    decorated.unshiftTag(1)
    // @ts-expect-error - invalid tag
    decorated.unshiftTag({})
  })
})

describe('input', () => {
  const schema = z.object({
    value: z.string(),
  })

  const schema2 = z.number()

  it('can modify one or multiple times', () => {
    const modified = decorated.input(schema)

    expectTypeOf(modified).toEqualTypeOf<
      DecoratedContractProcedure<typeof schema, undefined, Record<never, never>>
    >()

    expectTypeOf(modified.input(schema2)).toEqualTypeOf<
      DecoratedContractProcedure<typeof schema2, undefined, Record<never, never>>
    >()
  })

  it('typed example', () => {
    decorated.input(schema, { value: 'example' })
    decorated.input(schema2, 123)

    // @ts-expect-error - invalid example
    decorated.input(schema, { })
    // @ts-expect-error - invalid example
    decorated.input(schema2, 'string')
  })
})

describe('output', () => {
  const schema = z.object({
    value: z.string(),
  })

  const schema2 = z.number()

  it('can modify one or multiple times', () => {
    const modified = decorated.output(schema)

    expectTypeOf(modified).toEqualTypeOf<
      DecoratedContractProcedure<undefined, typeof schema, Record<never, never>>
    >()

    expectTypeOf(modified.output(schema2)).toEqualTypeOf<
      DecoratedContractProcedure<undefined, typeof schema2, Record<never, never>>
    >()
  })

  it('typed example', () => {
    decorated.output(schema, { value: 'example' })
    decorated.output(schema2, 123)

    // @ts-expect-error - invalid example
    decorated.output(schema, { })
    // @ts-expect-error - invalid example
    decorated.output(schema2, 'string')
  })
})

describe('errors', () => {
  const schema = z.object({
    value: z.string(),
  })

  const schema2 = z.number()

  it('can modify one or multiple times', () => {
    const modified = decorated.errors({
      BAD_GATEWAY: {
        data: schema,
      },
    })

    expectTypeOf(modified).toMatchTypeOf<
      DecoratedContractProcedure<undefined, undefined, { BAD_GATEWAY: { data: typeof schema } }>
    >()

    expectTypeOf(modified.errors({
      UNAUTHORIZED: {
        status: 2001,
        data: schema2,
      },
    })).toMatchTypeOf<
      DecoratedContractProcedure<undefined, undefined, { UNAUTHORIZED: { status: 2001, data: typeof schema2 } }>
    >()
  })
})
