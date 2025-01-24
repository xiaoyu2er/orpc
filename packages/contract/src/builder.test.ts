import { baseMeta, baseRoute, inputSchema, outputSchema, ping, pong } from '../tests/shared'
import { ContractBuilder } from './builder'
import { ContractBuilderWithErrors } from './builder-with-errors'
import { isContractProcedure } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { ContractRouterBuilder } from './router-builder'

const def = {
  errorMap: {},
  outputSchema: undefined,
  inputSchema: undefined,
  route: baseRoute,
  meta: baseMeta,
}

const builder = new ContractBuilder(def)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('contractBuilder', () => {
  it('is a contract procedure', () => {
    expect(builder).toSatisfy(isContractProcedure)
  })

  it('.$meta', () => {
    const meta = { dev: true, log: true }
    const applied = builder.$meta(meta)
    expect(applied).toBeInstanceOf(ContractBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc']).toEqual({
      ...def,
      meta,
    })
  })

  it('.$route', () => {
    const route = { path: '/api', method: 'GET' } as const

    const applied = builder.$route(route)
    expect(applied).toBeInstanceOf(ContractBuilder)
    expect(applied['~orpc']).toEqual({
      ...def,
      route,
    })
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: outputSchema } } as const

    const applied = builder.errors(errors)
    expect(applied).toBeInstanceOf(ContractBuilderWithErrors)
    expect(applied['~orpc']).toEqual({
      ...def,
      errorMap: errors,
    })
  })

  it('.meta', () => {
    const meta = { dev: true, log: true }
    const applied = builder.meta(meta)
    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied['~orpc']).toEqual({
      ...def,
      meta: { ...def.meta, ...meta },
    })
  })

  it('.route', () => {
    const route = { method: 'GET', path: '/path' } as const
    const applied = builder.route(route)
    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
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

  it('.prefix', () => {
    const applied = builder.prefix('/api')
    expect(applied).toBeInstanceOf(ContractRouterBuilder)
    expect(applied['~orpc']).toEqual({
      prefix: '/api',
      errorMap: {},
    })
  })

  it('.tag', () => {
    const applied = builder.tag('tag1', 'tag2')
    expect(applied).toBeInstanceOf(ContractRouterBuilder)
    expect(applied['~orpc']).toEqual({
      tags: ['tag1', 'tag2'],
      errorMap: {},
    })
  })

  it('.router', () => {
    const router = { ping, pong }
    const applied = builder.router(router)
    expect(applied).toBe(router)
  })
})
