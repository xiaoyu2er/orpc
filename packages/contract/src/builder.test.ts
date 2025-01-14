import { z } from 'zod'
import { ContractBuilder } from './builder'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'
import { ContractRouterBuilder } from './router-builder'

vi.mock('./procedure-decorated', () => ({
  DecoratedContractProcedure: vi.fn(),
}))

vi.mock('./router-builder', () => ({
  ContractRouterBuilder: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const baseErrorMap = {
  BASE: {
    status: 500,
    data: z.object({
      message: z.string(),
    }),
  },
}

const builder = new ContractBuilder({ errorMap: baseErrorMap })

const schema = z.object({ val: z.string().transform(val => Number(val)) })

describe('self chainable', () => {
  it('errors', () => {
    const errors = {
      BAD: {
        status: 500,
        data: schema,
      },
    }

    const applied = builder.errors(errors)

    expect(applied).not.toBe(builder)
    expect(applied).toBeInstanceOf(ContractBuilder)
    expect(applied['~orpc']).toEqual({
      errorMap: {
        ...baseErrorMap,
        ...errors,
      },
    })
  })
})

describe('to ContractRouterBuilder', () => {
  it('prefix', () => {
    expect(builder.prefix('/prefix')).toBeInstanceOf(ContractRouterBuilder)

    expect(ContractRouterBuilder).toHaveBeenCalledWith({
      prefix: '/prefix',
      errorMap: baseErrorMap,
    })
  })

  it('tag', () => {
    expect(builder.tag('tag1', 'tag2')).toBeInstanceOf(ContractRouterBuilder)

    expect(ContractRouterBuilder).toHaveBeenCalledWith({
      tags: ['tag1', 'tag2'],
      errorMap: baseErrorMap,
    })
  })
})

describe('to DecoratedContractProcedure', () => {
  it('route', () => {
    const route = { method: 'GET', path: '/path' } as const
    const procedure = builder.route(route)

    expect(procedure).toBeInstanceOf(DecoratedContractProcedure)
    expect(DecoratedContractProcedure).toHaveBeenCalledWith({ route, errorMap: baseErrorMap })
  })

  const schema = z.object({
    value: z.string(),
  })
  const example = { value: 'example' }

  it('input', () => {
    const procedure = builder.input(schema, example)

    expect(procedure).toBeInstanceOf(DecoratedContractProcedure)
    expect(DecoratedContractProcedure).toHaveBeenCalledWith({ InputSchema: schema, inputExample: example, errorMap: baseErrorMap })
  })

  it('output', () => {
    const procedure = builder.output(schema, example)

    expect(procedure).toBeInstanceOf(DecoratedContractProcedure)
    expect(DecoratedContractProcedure).toHaveBeenCalledWith({ OutputSchema: schema, outputExample: example, errorMap: baseErrorMap })
  })
})

describe('to router', () => {
  const router = {
    a: {
      b: {
        c: new ContractProcedure({ InputSchema: undefined, OutputSchema: undefined, errorMap: baseErrorMap }),
      },
    },
  }

  it('adapt all routers', () => {
    const routerFn = vi.fn()
    vi.mocked(ContractRouterBuilder).mockReturnValue({
      router: routerFn,
    } as any)

    const mockedValue = { __mocked__: true }
    routerFn.mockReturnValue(mockedValue)

    expect(builder.router(router)).toBe(mockedValue)
    expect(ContractRouterBuilder).toBeCalledTimes(1)
    expect(ContractRouterBuilder).toBeCalledWith({
      errorMap: baseErrorMap,
    })
    expect(routerFn).toBeCalledTimes(1)
    expect(routerFn).toBeCalledWith(router)
  })
})
