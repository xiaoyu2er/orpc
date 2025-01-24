import { baseErrorMap, ping, pong } from '../tests/shared'
import * as Router from './router'
import { ContractRouterBuilder } from './router-builder'

const adaptContractRouterSpy = vi.spyOn(Router, 'adaptContractRouter')

const builder = new ContractRouterBuilder({
  errorMap: baseErrorMap,
  prefix: '/api',
  tags: ['tag'],
})

describe('contractRouterBuilder', () => {
  it('.prefix', () => {
    const applied = builder.prefix('/more')
    expect(applied['~orpc'].prefix).toEqual('/api/more')
    expect(applied['~orpc'].tags).toEqual(['tag'])
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
  })

  it('.tag', () => {
    const applied = builder.tag('1', '2')
    expect(applied['~orpc'].prefix).toEqual('/api')
    expect(applied['~orpc'].tags).toEqual(['tag', '1', '2'])
    expect(applied['~orpc'].errorMap).toEqual(baseErrorMap)
  })

  it('.errors', () => {
    const errors = { INVALID: { message: 'INVALID' } }
    const applied = builder.errors(errors)
    expect(applied['~orpc'].prefix).toEqual('/api')
    expect(applied['~orpc'].tags).toEqual(['tag'])
    expect(applied['~orpc'].errorMap).toEqual({ ...baseErrorMap, ...errors })
  })

  it('.router', () => {
    const router = { ping, pong }
    const applied = builder.router(router)
    expect(applied).toBe(adaptContractRouterSpy.mock.results[0]!.value)
    expect(adaptContractRouterSpy).toBeCalledTimes(1)
    expect(adaptContractRouterSpy).toHaveBeenCalledWith(router, {
      errorMap: baseErrorMap,
      prefix: '/api',
      tags: ['tag'],
    })
  })
})
