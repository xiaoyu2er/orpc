import { z } from 'zod'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedContractProcedure } from './procedure-decorated'

const baseErrorMap = {
  BASE: {
    status: 500,
    data: z.object({
      message: z.string(),
    }),
  },
}

const baseRoute = {
  method: 'GET',
  path: '/v1/users',
  tags: ['tag'],
} as const

const outputSchema = z.object({ input: z.string().transform(v => Number.parseInt(v)) })

const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })

const builder = new ContractProcedureBuilderWithOutput({ InputSchema: undefined, OutputSchema: outputSchema, errorMap: baseErrorMap, route: baseRoute })

describe('decoratedContractProcedure', () => {
  it('is a procedure', () => {
    expect(builder).toBeInstanceOf(ContractProcedure)
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: z.object({ message: z.string() }) } } as const

    const applied = builder.errors(errors)

    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithOutput)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual({
      ...baseErrorMap,
      ...errors,
    })
    expect(applied['~orpc'].OutputSchema).toEqual(outputSchema)
    expect(applied['~orpc'].route).toEqual(baseRoute)
  })

  it('.route', () => {
    const applied = builder.route({ method: 'PATCH', description: 'new message' })

    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithOutput)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].OutputSchema).toEqual(outputSchema)
    expect(applied['~orpc'].route).toEqual({
      method: 'PATCH',
      description: 'new message',
      path: '/v1/users',
      tags: ['tag'],
    })
  })

  it('.prefix', () => {
    const applied = builder.prefix('/api')

    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithOutput)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].OutputSchema).toEqual(outputSchema)
    expect(applied['~orpc'].route).toEqual({
      method: 'GET',
      path: '/api/v1/users',
      tags: ['tag'],
    })
  })

  it('.unshiftTag', () => {
    const applied = builder.unshiftTag('tag2', 'tag3')

    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithOutput)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].OutputSchema).toEqual(outputSchema)
    expect(applied['~orpc'].route).toEqual({
      method: 'GET',
      tags: ['tag2', 'tag3', 'tag'],
      path: '/v1/users',
    })
  })

  it('.input', () => {
    const applied = builder.input(schema)
    expect(applied).toBeInstanceOf(DecoratedContractProcedure)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].route).toEqual(baseRoute)
    expect(applied['~orpc'].InputSchema).toEqual(schema)
    expect(applied['~orpc'].OutputSchema).toEqual(outputSchema)
  })
})
