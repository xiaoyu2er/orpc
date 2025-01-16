import { z } from 'zod'
import { ContractBuilder } from './builder'
import { ContractProcedure } from './procedure'
import { ContractProcedureBuilder } from './procedure-builder'
import { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { ContractRouterBuilder } from './router-builder'

vi.mock('./router-builder', async (origin) => {
  const ContractRouterBuilder = vi.fn()
  ContractRouterBuilder.prototype.router = vi.fn(() => '__router__')

  return {
    ContractRouterBuilder,
  }
})

const ContractRouterBuilderRouterSpy = vi.spyOn(ContractRouterBuilder.prototype, 'router')

const schema = z.object({ value: z.string() })

const baseErrorMap = {
  BASE: {
    data: z.object({
      message: z.string(),
    }),
  },
}

const builder = new ContractBuilder({ errorMap: baseErrorMap, OutputSchema: undefined, InputSchema: undefined })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('contractBuilder', () => {
  it('is a contract procedure', () => {
    expect(builder).toBeInstanceOf(ContractProcedure)
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: schema } } as const

    const applied = builder.errors(errors)
    expect(applied).toBeInstanceOf(ContractBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].errorMap).toEqual({
      ...baseErrorMap,
      ...errors,
    })
  })

  it('.route', () => {
    const route = { method: 'GET', path: '/path' } as const
    const applied = builder.route(route)
    expect(applied).toBeInstanceOf(ContractProcedureBuilder)
    expect(applied['~orpc'].route).toEqual(route)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
  })

  it('.input', () => {
    const applied = builder.input(schema)
    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithInput)
    expect(applied['~orpc'].InputSchema).toEqual(schema)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
  })

  it('.output', () => {
    const applied = builder.output(schema)
    expect(applied).toBeInstanceOf(ContractProcedureBuilderWithOutput)
    expect(applied['~orpc'].OutputSchema).toEqual(schema)
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
  })

  it('.prefix', () => {
    const applied = builder.prefix('/api')
    expect(applied).toBeInstanceOf(ContractRouterBuilder)
    expect(applied).toBe(vi.mocked(ContractRouterBuilder).mock.results[0]!.value)
    expect(ContractRouterBuilder).toHaveBeenCalledWith({
      prefix: '/api',
      errorMap: baseErrorMap,
    })
  })

  it('.tag', () => {
    const applied = builder.tag('tag1', 'tag2')
    expect(applied).toBeInstanceOf(ContractRouterBuilder)
    expect(applied).toBe(vi.mocked(ContractRouterBuilder).mock.results[0]!.value)
    expect(ContractRouterBuilder).toHaveBeenCalledWith({
      tags: ['tag1', 'tag2'],
      errorMap: baseErrorMap,
    })
  })

  it('.router', () => {
    const router = {
      ping: {} as any,
      pong: {} as any,
    }

    const applied = builder.router(router)

    expect(applied).toBe(ContractRouterBuilderRouterSpy.mock.results[0]!.value)
    expect(ContractRouterBuilderRouterSpy).toHaveBeenCalledWith(router)
    expect(ContractRouterBuilder).toHaveBeenCalledWith({
      errorMap: baseErrorMap,
    })
  })
})
