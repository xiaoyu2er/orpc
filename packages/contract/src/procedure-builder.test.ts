import { z } from 'zod'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'

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

const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })

const builder = new ContractProcedureBuilder({ InputSchema: undefined, OutputSchema: undefined, errorMap: baseErrorMap, route: baseRoute })

describe('decoratedContractProcedure', () => {
  it('is a procedure', () => {
    expect(builder).toBeInstanceOf(ContractProcedure)
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: z.object({ message: z.string() }) } } as const

    const applied = builder.errors(errors)

    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual({
      ...baseErrorMap,
      ...errors,
    })
    expect(applied['~orpc'].route).toEqual(baseRoute)
  })

  it('.route', () => {
    const applied = builder.route({ method: 'PATCH', description: 'new message' })

    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].route).toEqual({
      method: 'PATCH',
      description: 'new message',
      path: '/v1/users',
      tags: ['tag'],
    })
  })

  it('.prefix', () => {
    const applied = builder.prefix('/api')

    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].route).toEqual({
      method: 'GET',
      path: '/api/v1/users',
      tags: ['tag'],
    })
  })

  it('.unshiftTag', () => {
    const applied = builder.unshiftTag('tag2', 'tag3')

    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].route).toEqual({
      method: 'GET',
      tags: ['tag2', 'tag3', 'tag'],
      path: '/v1/users',
    })
  })

  it('.input', () => {
    const applied = builder.input(schema)
    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithInput)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].route).toEqual(baseRoute)
    expect(applied['~orpc'].InputSchema).toEqual(schema)
  })

  it('.output', () => {
    const applied = builder.output(schema)
    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithOutput)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].route).toEqual(baseRoute)
    expect(applied['~orpc'].OutputSchema).toEqual(schema)
  })
})
