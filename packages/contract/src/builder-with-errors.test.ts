import { baseErrorMap, baseMeta, baseRoute, inputSchema, outputSchema, ping, pong } from '../tests/shared'
import { ContractBuilderWithErrors } from './builder-with-errors'
import { isContractProcedure } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { ContractRouterBuilder } from './router-builder'
import * as Router from './router-utils'

const adaptContractRouterSpy = vi.spyOn(Router, 'adaptContractRouter')

const builder = new ContractBuilderWithErrors({
  errorMap: baseErrorMap,
  outputSchema: undefined,
  inputSchema: undefined,
  route: baseRoute,
  meta: baseMeta,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('contractBuilder', () => {
  it('is a contract procedure', () => {
    expect(builder).toSatisfy(isContractProcedure)
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: outputSchema } } as const

    const applied = builder.errors(errors)
    expect(applied).toBeInstanceOf(ContractBuilderWithErrors)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual({ ...baseErrorMap, ...errors })
    expect(applied['~orpc'].meta).toBe(baseMeta)
    expect(applied['~orpc'].route).toBe(baseRoute)
  })

  it('.meta', () => {
    const meta = { dev: true, log: true }
    const applied = builder.meta(meta)
    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].meta).toEqual({ ...baseMeta, ...meta })
    expect(applied['~orpc'].route).toBe(baseRoute)
    expect(applied['~orpc'].errorMap).toBe(baseErrorMap)
  })

  it('.route', () => {
    const route = { method: 'GET', path: '/path' } as const
    const applied = builder.route(route)
    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied['~orpc'].route).toEqual({ ...baseRoute, ...route })
    expect(applied['~orpc'].meta).toBe(baseMeta)
    expect(applied['~orpc'].errorMap).toBe(baseErrorMap)
  })

  it('.input', () => {
    const applied = builder.input(inputSchema)
    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithInput)
    expect(applied['~orpc'].inputSchema).toEqual(inputSchema)
    expect(applied['~orpc'].route).toEqual(baseRoute)
    expect(applied['~orpc'].meta).toEqual(baseMeta)
    expect(applied['~orpc'].errorMap).toBe(baseErrorMap)
  })

  it('.output', () => {
    const applied = builder.output(outputSchema)
    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithOutput)
    expect(applied['~orpc'].outputSchema).toEqual(outputSchema)
    expect(applied['~orpc'].route).toEqual(baseRoute)
    expect(applied['~orpc'].meta).toEqual(baseMeta)
    expect(applied['~orpc'].errorMap).toBe(baseErrorMap)
  })

  it('.prefix', () => {
    const applied = builder.prefix('/api')
    expect(applied).toBeInstanceOf(ContractRouterBuilder)
    expect(applied['~orpc'].prefix).toBe('/api')
    expect(applied['~orpc'].errorMap).toBe(baseErrorMap)
  })

  it('.tag', () => {
    const applied = builder.tag('tag1', 'tag2')
    expect(applied).toBeInstanceOf(ContractRouterBuilder)
    expect(applied['~orpc'].tags).toEqual(['tag1', 'tag2'])
    expect(applied['~orpc'].errorMap).toBe(baseErrorMap)
  })

  it('.router', () => {
    const router = { ping, pong }
    const applied = builder.router(router)
    expect(applied).toBe(adaptContractRouterSpy.mock.results[0]?.value)

    expect(adaptContractRouterSpy).toBeCalledTimes(1)
    expect(adaptContractRouterSpy).toBeCalledWith(router, baseErrorMap, undefined, undefined)
  })
})
