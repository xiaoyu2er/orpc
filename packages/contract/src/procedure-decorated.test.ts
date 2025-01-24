import { baseErrorMap, baseMeta, baseRoute, inputSchema, outputSchema } from '../tests/shared'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'

const def = {
  inputSchema,
  outputSchema,
  errorMap: baseErrorMap,
  route: baseRoute,
  meta: baseMeta,
}

const builder = new DecoratedContractProcedure(def)

describe('decoratedContractProcedure', () => {
  it('is a procedure', () => {
    expect(builder).toBeInstanceOf(ContractProcedure)
  })

  it('.errors', () => {
    const errors = {
      BAD_GATEWAY: { message: 'BAD_GATEWAY' },
      BASE2: { message: 'BASE2' },
    } as const

    const applied = builder.errors(errors)
    expect(applied).toBeInstanceOf(DecoratedContractProcedure)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      errorMap: { ...def.errorMap, ...errors },
    })
  })

  it('.meta', () => {
    const meta = { dev: true, log: true }

    const applied = builder.meta(meta)
    expect(applied).toBeInstanceOf(DecoratedContractProcedure)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      meta: { ...def.meta, ...meta },
    })
  })

  it('.route', () => {
    const route = { method: 'POST', path: '/v2/users', tags: ['tag'] } as const

    const applied = builder.route(route)
    expect(applied).toBeInstanceOf(DecoratedContractProcedure)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      route: { ...def.route, ...route },
    })
  })
})
