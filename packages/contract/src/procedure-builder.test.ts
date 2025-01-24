import { z } from 'zod'
import { baseErrorMap, baseMeta, baseRoute, inputSchema, outputSchema } from '../tests/shared'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'

const def = {
  inputSchema: undefined,
  outputSchema: undefined,
  errorMap: baseErrorMap,
  route: baseRoute,
  meta: baseMeta,
}

const builder = new ContractProcedureBuilder(def)

describe('decoratedContractProcedure', () => {
  it('is a procedure', () => {
    expect(builder).toBeInstanceOf(ContractProcedure)
  })

  it('.errors', () => {
    const errors = {
      BAD_GATEWAY: { data: z.object({ message: z.string() }) },
      BASE2: { data: z.object({ message: z.string() }) },
    } as const

    const applied = builder.errors(errors)
    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc']).toEqual({
      ...def,
      errorMap: { ...def.errorMap, ...errors },
    })
  })

  it('.meta', () => {
    const meta = { dev: true, log: true }
    const applied = builder.meta(meta)
    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc']).toEqual({
      ...def,
      meta: { ...def.meta, ...meta },
    })
  })

  it('.route', () => {
    const route = { method: 'POST', path: '/v2/users', tags: ['tag'] } as const
    const applied = builder.route(route)
    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc']).toEqual({
      ...def,
      route: { ...def.route, ...route },
    })
  })

  it('.input', () => {
    const applied = builder.input(inputSchema)
    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithInput)
    expect(applied['~orpc']).toEqual({
      ...def,
      inputSchema,
    })
  })

  it('.output', () => {
    const applied = builder.output(outputSchema)
    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithOutput)
    expect(applied['~orpc']).toEqual({
      ...def,
      outputSchema,
    })
  })
})
