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

describe('decorate', () => {
  const procedure = new ContractProcedure({ InputSchema, OutputSchema, errorMap: baseErrorMap })

  it('works', () => {
    const decorated = DecoratedContractProcedure.decorate(procedure)
    expect(decorated).toBeInstanceOf(DecoratedContractProcedure)
    expect(decorated['~orpc']).toBe(procedure['~orpc'])
  })
})

describe('route', () => {
  const decorated = new DecoratedContractProcedure({ InputSchema, OutputSchema, errorMap: baseErrorMap })

  it('works', () => {
    const route = { method: 'GET', path: '/path' } as const
    const routed = decorated.route(route)
    expect(routed).toBeInstanceOf(DecoratedContractProcedure)
    expect(routed['~orpc']).toEqual({ route, errorMap: baseErrorMap, InputSchema, OutputSchema })
  })

  it('not reference', () => {
    const routed = decorated.route({})
    expect(routed['~orpc']).not.toBe(decorated['~orpc'])
    expect(routed).not.toBe(decorated)
  })

  it('should spread merge route options', () => {
    const routed = decorated
      .route({ inputStructure: 'detailed' })
      .route({ outputStructure: 'detailed' })

    expect(routed['~orpc']).toEqual({
      route: {
        inputStructure: 'detailed',
        outputStructure: 'detailed',
      },
      errorMap: baseErrorMap,
      InputSchema,
      OutputSchema,
    })
  })
})

describe('prefix', () => {
  const decorated = new DecoratedContractProcedure({ InputSchema, OutputSchema, route: { path: '/path' }, errorMap: baseErrorMap })

  it('works', () => {
    const prefixed = decorated.prefix('/prefix')
    expect(prefixed).toBeInstanceOf(DecoratedContractProcedure)
    expect(prefixed['~orpc']).toEqual({ route: { path: '/prefix/path' }, errorMap: baseErrorMap, InputSchema, OutputSchema })
  })

  it('do nothing on non-path procedure', () => {
    const decorated = new DecoratedContractProcedure({ InputSchema: undefined, OutputSchema: undefined, errorMap: baseErrorMap })
    const prefixed = decorated.prefix('/prefix')
    expect(prefixed).toBeInstanceOf(DecoratedContractProcedure)
    expect(prefixed['~orpc']).toEqual({ errorMap: baseErrorMap })
  })

  it('not reference', () => {
    const prefixed = decorated.prefix('/prefix')
    expect(prefixed['~orpc']).not.toBe(decorated['~orpc'])
    expect(prefixed).not.toBe(decorated)
  })
})

describe('unshiftTag', () => {
  const decorated = new DecoratedContractProcedure({ InputSchema: undefined, OutputSchema: undefined, errorMap: baseErrorMap })

  it('works', () => {
    const tagged = decorated.unshiftTag('tag1', 'tag2')
    expect(tagged).toBeInstanceOf(DecoratedContractProcedure)
    expect(tagged['~orpc']).toEqual({ route: { tags: ['tag1', 'tag2'] }, errorMap: baseErrorMap })

    const tagged2 = tagged.unshiftTag('tag3')
    expect(tagged2).toBeInstanceOf(DecoratedContractProcedure)
    expect(tagged2['~orpc']).toEqual({ route: { tags: ['tag3', 'tag1', 'tag2'] }, errorMap: baseErrorMap })
  })

  it('not reference', () => {
    const tagged = decorated.unshiftTag('tag1', 'tag2')
    expect(tagged['~orpc']).not.toBe(decorated['~orpc'])
    expect(tagged).not.toBe(decorated)
  })

  it('prevent duplicate', () => {
    const tagged = decorated.unshiftTag('tag1', 'tag2')
    const tagged2 = tagged.unshiftTag('tag1', 'tag3')
    expect(tagged2['~orpc'].route?.tags).toEqual(['tag1', 'tag3', 'tag2'])
  })
})

describe('input', () => {
  const decorated = new DecoratedContractProcedure({ InputSchema, OutputSchema, errorMap: baseErrorMap })
  const schema = z.object({
    value: z.string(),
  })
  const example = { value: 'example' }

  it('works', () => {
    const inputted = decorated.input(schema, example)
    expect(inputted).toBeInstanceOf(DecoratedContractProcedure)
    expect(inputted['~orpc']).toEqual({ InputSchema: schema, inputExample: example, errorMap: baseErrorMap, OutputSchema })
  })

  it('not reference', () => {
    const inputted = decorated.input(schema, example)
    expect(inputted['~orpc']).not.toBe(decorated['~orpc'])
    expect(inputted).not.toBe(decorated)
  })
})

describe('output', () => {
  const decorated = new DecoratedContractProcedure({ InputSchema, OutputSchema, errorMap: baseErrorMap })
  const schema = z.object({
    value: z.string(),
  })
  const example = { value: 'example' }

  it('works', () => {
    const outputted = decorated.output(schema, example)
    expect(outputted).toBeInstanceOf(DecoratedContractProcedure)
    expect(outputted['~orpc']).toEqual({ OutputSchema: schema, outputExample: example, errorMap: baseErrorMap, InputSchema })
  })

  it('not reference', () => {
    const outputted = decorated.output(schema, example)
    expect(outputted['~orpc']).not.toBe(decorated['~orpc'])
    expect(outputted).not.toBe(decorated)
  })
})

describe('errors', () => {
  const decorated = new DecoratedContractProcedure({ InputSchema, OutputSchema, errorMap: baseErrorMap })
  const schema = z.object({
    value: z.string(),
  })
  const errors = {
    BASE: undefined, // ensure the new errors not override the old errorMap
    BAD_GATEWAY: {
      status: 400,
      data: schema,
    },
  }

  it('works', () => {
    const errored = decorated.errors(errors)
    expect(errored).toBeInstanceOf(DecoratedContractProcedure)
    expect(errored['~orpc']).toEqual({
      InputSchema,
      OutputSchema,
      errorMap: {
        ...errors,
        ...baseErrorMap,
      },
    })
  })

  it('not reference', () => {
    const errored = decorated.errors(errors)
    expect(errored['~orpc']).not.toBe(decorated['~orpc'])
    expect(errored).not.toBe(decorated)
  })
})
