import { z } from 'zod'
import { baseErrorMap, baseMeta, baseRoute, inputSchema, outputSchema } from '../tests/shared'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'

const builder = new ContractProcedureBuilder({
  inputSchema: undefined,
  outputSchema: undefined,
  errorMap: baseErrorMap,
  route: baseRoute,
  meta: baseMeta,
})

describe('decoratedContractProcedure', () => {
  it('is a procedure', () => {
    expect(builder).toBeInstanceOf(ContractProcedure)
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: z.object({ message: z.string() }) } } as const
    const applied = builder.errors(errors)
    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual({ ...baseErrorMap, ...errors })
    expect(applied['~orpc'].route).toEqual(baseRoute)
    expect(applied['~orpc'].meta).toEqual(baseMeta)
  })

  it('.meta', () => {
    const meta = { dev: true, log: true }
    const applied = builder.meta(meta)
    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].route).toEqual(baseRoute)
    expect(applied['~orpc'].meta).toEqual({ ...baseMeta, ...meta })
  })

  it('.route', () => {
    const route = { method: 'POST', path: '/v2/users', tags: ['tag'] } as const
    const applied = builder.route(route)
    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].route).toEqual({ ...baseRoute, ...route })
    expect(applied['~orpc'].meta).toEqual(baseMeta)
  })

  it('.input', () => {
    const applied = builder.input(inputSchema)
    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithInput)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].inputSchema).toEqual(inputSchema)
    expect(applied['~orpc'].route).toEqual(baseRoute)
    expect(applied['~orpc'].meta).toEqual(baseMeta)
  })

  it('.output', () => {
    const applied = builder.output(outputSchema)
    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithOutput)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].outputSchema).toEqual(outputSchema)
    expect(applied['~orpc'].route).toEqual(baseRoute)
    expect(applied['~orpc'].meta).toEqual(baseMeta)
  })
})
