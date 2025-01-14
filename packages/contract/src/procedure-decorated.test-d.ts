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

const decorated = new DecoratedContractProcedure({ InputSchema, OutputSchema, errorMap: baseErrorMap })

describe('decorate', () => {
  const schema = z.object({
    value: z.string(),
  })

  it('works', () => {
    const simpleProcedure = new ContractProcedure({ InputSchema: schema, OutputSchema: undefined, errorMap: baseErrorMap })

    expectTypeOf(DecoratedContractProcedure.decorate(simpleProcedure)).toEqualTypeOf<
      DecoratedContractProcedure<typeof schema, undefined, typeof baseErrorMap>
    >()

    expectTypeOf(DecoratedContractProcedure.decorate(decorated)).toEqualTypeOf<
      DecoratedContractProcedure<typeof InputSchema, typeof OutputSchema, typeof baseErrorMap>
    >()
  })
})

describe('route', () => {
  it('return ContractProcedure', () => {
    const routed = decorated.route({})
    expectTypeOf(routed).toEqualTypeOf<DecoratedContractProcedure<typeof InputSchema, typeof OutputSchema, typeof baseErrorMap>>()
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
    expectTypeOf(prefixed).toEqualTypeOf<DecoratedContractProcedure<typeof InputSchema, typeof OutputSchema, typeof baseErrorMap>>()
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
    expectTypeOf(tagged).toEqualTypeOf<DecoratedContractProcedure<typeof InputSchema, typeof OutputSchema, typeof baseErrorMap>>()
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
      DecoratedContractProcedure<typeof schema, typeof OutputSchema, typeof baseErrorMap>
    >()

    expectTypeOf(modified.input(schema2)).toEqualTypeOf<
      DecoratedContractProcedure<typeof schema2, typeof OutputSchema, typeof baseErrorMap>
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
      DecoratedContractProcedure<typeof InputSchema, typeof schema, typeof baseErrorMap>
    >()

    expectTypeOf(modified.output(schema2)).toEqualTypeOf<
      DecoratedContractProcedure<typeof InputSchema, typeof schema2, typeof baseErrorMap>
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
    const errors = {
      BAD_GATEWAY: {
        data: schema,
      },
    }

    const modified = decorated.errors(errors)

    expectTypeOf(modified).toEqualTypeOf<
      DecoratedContractProcedure<typeof InputSchema, typeof OutputSchema, typeof baseErrorMap & typeof errors>
    >()

    const errors2 = {
      UNAUTHORIZED: {
        status: 2001,
        data: schema2,
      },
    }

    expectTypeOf(modified.errors(errors2)).toEqualTypeOf<
      DecoratedContractProcedure<typeof InputSchema, typeof OutputSchema, typeof baseErrorMap & typeof errors & typeof errors2>
    >()
  })

  it('prevent redefine old errorMap', () => {
    // @ts-expect-error - not allow redefine errorMap
    decorated.errors({ BASE: baseErrorMap.BASE })
    // @ts-expect-error - not allow redefine errorMap --- even with undefined
    decorated.errors({ BASE: undefined })
  })
})
