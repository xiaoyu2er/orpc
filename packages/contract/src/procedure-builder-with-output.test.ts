import { z } from 'zod'
import { baseErrorMap, baseMeta, baseRoute, inputSchema, outputSchema } from '../tests/shared'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedContractProcedure } from './procedure-decorated'

const builder = new ContractProcedureBuilderWithOutput({
  inputSchema: undefined,
  outputSchema,
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
    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithOutput)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual({ ...baseErrorMap, ...errors })
    expect(applied['~orpc'].outputSchema).toEqual(outputSchema)
    expect(applied['~orpc'].route).toEqual(baseRoute)
    expect(applied['~orpc'].meta).toEqual(baseMeta)
  })

  it('.meta', () => {
    const meta = { dev: true, log: true }
    const applied = builder.meta(meta)
    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithOutput)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].outputSchema).toEqual(outputSchema)
    expect(applied['~orpc'].route).toEqual(baseRoute)
    expect(applied['~orpc'].meta).toEqual({ ...baseMeta, ...meta })
  })

  it('.route', () => {
    const route = { method: 'POST', path: '/v2/users', tags: ['tag'] } as const
    const applied = builder.route(route)
    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithOutput)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].outputSchema).toEqual(outputSchema)
    expect(applied['~orpc'].route).toEqual({ ...baseRoute, ...route })
    expect(applied['~orpc'].meta).toEqual(baseMeta)
  })

  it('.input', () => {
    const applied = builder.input(inputSchema)
    expect(applied).toBeInstanceOf(DecoratedContractProcedure)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
    expect(applied['~orpc'].inputSchema).toEqual(inputSchema)
    expect(applied['~orpc'].outputSchema).toEqual(outputSchema)
    expect(applied['~orpc'].route).toEqual(baseRoute)
    expect(applied['~orpc'].meta).toEqual(baseMeta)
  })
})
