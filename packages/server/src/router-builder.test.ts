import { baseErrorMap } from '../../contract/tests/shared'
import { router } from '../tests/shared'
import { RouterBuilder } from './router-builder'
import * as RouterUtils from './router-utils'

const adaptRouterSpy = vi.spyOn(RouterUtils, 'adaptRouter')

const mid = vi.fn()

const def = {
  middlewares: [mid],
  errorMap: baseErrorMap,
}

const builder = new RouterBuilder(def) as any

describe('routerBuilder', () => {
  it('not allow dynamic params on prefix', () => {
    expect(() => builder.prefix('/{id}')).toThrowError()
  })

  it('.prefix', () => {
    const applied = builder.prefix('/prefix1').prefix('/prefix2')
    expect(applied).not.toBe(builder)
    expect(applied).toBeInstanceOf(RouterBuilder)

    expect(applied['~orpc']).toEqual({
      ...def,
      prefix: '/prefix1/prefix2',
    })
  })

  it('.tag', () => {
    const applied = builder.tag('tag1').tag('tag2', 'tag3')
    expect(applied).not.toBe(builder)
    expect(applied).toBeInstanceOf(RouterBuilder)

    expect(applied['~orpc']).toEqual({
      ...def,
      tags: ['tag1', 'tag2', 'tag3'],
    })
  })

  it('.use', () => {
    const mid2 = vi.fn()
    const mid3 = vi.fn()

    const applied = builder.use(mid2).use(mid3)
    expect(applied).not.toBe(builder)
    expect(applied).toBeInstanceOf(RouterBuilder)

    expect(applied['~orpc']).toEqual({
      ...def,
      middlewares: [mid, mid2, mid3],
    })
  })

  it('.errors', () => {
    const errors = { INVALID: {} }

    const applied = builder.errors(errors)
    expect(applied).not.toBe(builder)
    expect(applied).toBeInstanceOf(RouterBuilder)

    expect(applied['~orpc']).toEqual({
      ...def,
      errorMap: { ...def.errorMap, ...errors },
    })
  })

  it('.router', () => {
    const applied = builder.prefix('/prefix').tag('tag').router(router)

    expect(applied).toBe(adaptRouterSpy.mock.results[0]?.value)
    expect(adaptRouterSpy).toBeCalledTimes(1)
    expect(adaptRouterSpy).toBeCalledWith(router, {
      ...def,
      prefix: '/prefix',
      tags: ['tag'],
    })
  })
})
