import { enhanceRoute, getLazyMeta, isLazy, unlazy } from '@orpc/contract'
import { ping, pingMiddleware, pong, router } from '../tests/shared'
import { enhanceRouter, getRouter } from './router-utils'

it('getRouter', () => {
  expect(getRouter(router, [])).toEqual(router)
  expect(getRouter(router, ['ping'])).toEqual(router.ping)
  expect(getRouter(router, ['nested', 'pong'])).toSatisfy(isLazy)
  expect(unlazy(getRouter(router, ['nested', 'pong']))).resolves.toEqual({ default: pong })

  expect(getRouter(router, ['not-exist'])).toBeUndefined()
  expect(getRouter(router, ['nested', 'not-exist', 'not-exist'])).toSatisfy(isLazy)
  expect(unlazy(getRouter(router, ['nested', 'not-exist', 'not-exist']))).resolves.toEqual({ default: undefined })

  expect(getRouter(router, ['pong', '~orpc'])).toBeUndefined()
  expect(getRouter(router, ['ping', '~orpc'])).toSatisfy(isLazy)
  expect(unlazy(getRouter(router, ['ping', '~orpc']))).resolves.toEqual({ default: undefined })
})

describe('enhanceRouter', () => {
  it('works', async () => {
    const mid = vi.fn()
    const extraErrorMap = { EXTRA: {} }
    const options = {
      errorMap: extraErrorMap,
      middlewares: [mid, pingMiddleware],
      prefix: '/adapt',
      tags: ['adapt'],
    } as const

    const enhanced = enhanceRouter(router, options)

    expect(enhanced.ping).toSatisfy(isLazy)
    expect((await unlazy(enhanced.ping)).default['~orpc'].middlewares).toEqual([mid, ...ping['~orpc'].middlewares])
    expect((await unlazy(enhanced.ping)).default['~orpc'].route).toEqual(enhanceRoute(ping['~orpc'].route, options))
    expect((await unlazy(enhanced.ping)).default['~orpc'].inputValidationIndex).toEqual(2)
    expect((await unlazy(enhanced.ping)).default['~orpc'].outputValidationIndex).toEqual(2)
    expect(getLazyMeta(enhanced.ping)).toEqual({ prefix: '/adapt' })

    expect(enhanced.pong['~orpc'].middlewares).toEqual([mid, pingMiddleware, ...pong['~orpc'].middlewares])
    expect(enhanced.pong['~orpc'].route).toEqual(enhanceRoute(pong['~orpc'].route, options))
    expect(enhanced.pong['~orpc'].inputValidationIndex).toEqual(2)
    expect(enhanced.pong['~orpc'].outputValidationIndex).toEqual(2)

    expect(enhanced.nested).toSatisfy(isLazy)
    expect(getLazyMeta(enhanced.nested)).toEqual({ prefix: '/adapt' })

    expect(enhanced.nested.ping).toSatisfy(isLazy)
    expect((await unlazy(enhanced.nested.ping)).default['~orpc'].middlewares).toEqual([mid, ...ping['~orpc'].middlewares])
    expect((await unlazy(enhanced.nested.ping)).default['~orpc'].route).toEqual(enhanceRoute(ping['~orpc'].route, options))
    expect((await unlazy(enhanced.nested.ping)).default['~orpc'].inputValidationIndex).toEqual(2)
    expect((await unlazy(enhanced.nested.ping)).default['~orpc'].outputValidationIndex).toEqual(2)
    expect(getLazyMeta(enhanced.nested.ping)).toEqual({ prefix: '/adapt' })

    expect(enhanced.nested.pong).toSatisfy(isLazy)
    expect((await unlazy(enhanced.nested.pong)).default['~orpc'].middlewares).toEqual([mid, pingMiddleware, ...pong['~orpc'].middlewares])
    expect((await unlazy(enhanced.nested.pong)).default['~orpc'].route).toEqual(enhanceRoute(pong['~orpc'].route, options))
    expect((await unlazy(enhanced.nested.pong)).default['~orpc'].inputValidationIndex).toEqual(2)
    expect((await unlazy(enhanced.nested.pong)).default['~orpc'].outputValidationIndex).toEqual(2)
    expect(getLazyMeta(enhanced.nested.pong)).toEqual({ prefix: '/adapt' })
  })

  it('can merge lazy prefix', async () => {
    const enhanced = enhanceRouter(
      enhanceRouter(router, { errorMap: {}, prefix: '/enhanced', tags: [], middlewares: [] }),
      { errorMap: {}, prefix: '/prefix', tags: [], middlewares: [] },
    )

    expect(getLazyMeta(enhanced.ping)).toEqual({ prefix: '/prefix/enhanced' })
    expect(getLazyMeta(enhanced.nested)).toEqual({ prefix: '/prefix/enhanced' })
    expect(getLazyMeta(enhanced.nested.ping)).toEqual({ prefix: '/prefix/enhanced' })
    expect(getLazyMeta(enhanced.nested.pong)).toEqual({ prefix: '/prefix/enhanced' })
  })
})
