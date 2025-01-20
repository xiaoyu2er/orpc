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
  method: 'GET',
  path: '/v1/users',
  tags: ['tag'],
} as const

const decorated = new DecoratedContractProcedure({ InputSchema, OutputSchema, errorMap: baseErrorMap, route: baseRoute })

describe('decoratedContractProcedure', () => {
  it('is a procedure', () => {
    expect(decorated).toBeInstanceOf(ContractProcedure)
  })

  it('.decorate', () => {
    const applied = DecoratedContractProcedure.decorate(new ContractProcedure({ InputSchema, OutputSchema, errorMap: baseErrorMap, route: baseRoute }))

    expect(applied).toEqual(decorated)
    expect(applied).not.toBe(decorated)

    expect(DecoratedContractProcedure.decorate(decorated))
      .toBe(decorated)
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: z.object({ message: z.string() }) } } as const

    const applied = decorated.errors(errors)

    expect(applied).toBeInstanceOf(DecoratedContractProcedure)
    expect(applied).not.toBe(decorated)
    expect(applied['~orpc'].errorMap).toEqual({
      ...baseErrorMap,
      ...errors,
    })
    expect(applied['~orpc'].InputSchema).toEqual(InputSchema)
    expect(applied['~orpc'].OutputSchema).toEqual(OutputSchema)
    expect(applied['~orpc'].route).toEqual(baseRoute)
  })

  it('.route', () => {
    const applied = decorated.route({ method: 'PATCH', description: 'new message' })

    expect(applied).toBeInstanceOf(DecoratedContractProcedure)
    expect(applied).not.toBe(decorated)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].InputSchema).toEqual(InputSchema)
    expect(applied['~orpc'].OutputSchema).toEqual(OutputSchema)
    expect(applied['~orpc'].route).toEqual({
      method: 'PATCH',
      description: 'new message',
      path: '/v1/users',
      tags: ['tag'],
    })
  })

  describe('.prefix', () => {
    it('when has path', () => {
      const applied = decorated.prefix('/api')

      expect(applied).toBeInstanceOf(DecoratedContractProcedure)
      expect(applied).not.toBe(decorated)
      expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
      expect(applied['~orpc'].InputSchema).toEqual(InputSchema)
      expect(applied['~orpc'].OutputSchema).toEqual(OutputSchema)
      expect(applied['~orpc'].route).toEqual({
        method: 'GET',
        path: '/api/v1/users',
        tags: ['tag'],
      })
    })

    it('when has no path', () => {
      const decorated = new DecoratedContractProcedure({ InputSchema, OutputSchema, errorMap: baseErrorMap, route: {} })
      const applied = decorated.prefix('/api')
      expect(applied['~orpc'].route).toEqual({})
    })
  })

  describe('.unshiftTag', () => {
    it('works', () => {
      const applied = decorated.unshiftTag('tag2', 'tag3')

      expect(applied).toBeInstanceOf(DecoratedContractProcedure)
      expect(applied).not.toBe(decorated)
      expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
      expect(applied['~orpc'].InputSchema).toEqual(InputSchema)
      expect(applied['~orpc'].OutputSchema).toEqual(OutputSchema)
      expect(applied['~orpc'].route).toEqual({
        method: 'GET',
        tags: ['tag2', 'tag3', 'tag'],
        path: '/v1/users',
      })
    })

    it('decorated without existing tag', () => {
      const decorated = new DecoratedContractProcedure({ InputSchema, OutputSchema, errorMap: baseErrorMap, route: {} })

      const applied = decorated.unshiftTag('tag', 'tag2')
      expect(applied['~orpc'].route).toEqual({
        tags: ['tag', 'tag2'],
      })
    })
  })
})
