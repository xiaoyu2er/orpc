import { ping, pong, router } from '../tests/shared'
import { getLazyMeta, isLazy, lazy, unlazy } from './lazy'
import { enhanceRoute } from './route'
import { createAccessibleLazyRouter, enhanceContractRouter, getContractRouter } from './router-utils'

it('getContractRouter', () => {
  expect(getContractRouter(router, [])).toEqual(router)
  expect(getContractRouter(router, ['ping'])).toEqual(router.ping)
  expect(getContractRouter(router, ['nested', 'pong'])).toSatisfy(isLazy)
  expect(unlazy(getContractRouter(router, ['nested', 'pong']))).resolves.toEqual({ default: pong })

  expect(getContractRouter(router, ['not-exist'])).toBeUndefined()
  expect(getContractRouter(router, ['nested', 'not-exist', 'not-exist'])).toSatisfy(isLazy)
  expect(unlazy(getContractRouter(router, ['nested', 'not-exist', 'not-exist']))).resolves.toEqual({ default: undefined })

  expect(getContractRouter(router, ['pong', '~orpc'])).toBeUndefined()
  expect(getContractRouter(router, ['ping', '~orpc'])).toSatisfy(isLazy)
  expect(unlazy(getContractRouter(router, ['ping', '~orpc']))).resolves.toEqual({ default: undefined })
})

it('createAccessibleLazyRouter', async () => {
  const accessible = createAccessibleLazyRouter(lazy(() => Promise.resolve({ default: router }), { prefix: '/prefix' }))

  await expect(unlazy(accessible.ping)).resolves.toEqual({ default: ping })
  await expect(unlazy(accessible.pong)).resolves.toEqual({ default: pong })
  await expect(unlazy(accessible.nested.ping)).resolves.toEqual({ default: ping })
  await expect(unlazy(accessible.nested.pong)).resolves.toEqual({ default: pong })

  expect(getLazyMeta(accessible.ping)).toEqual({ prefix: '/prefix' })
  expect(getLazyMeta(accessible.pong)).toEqual({ prefix: '/prefix' })
  expect(getLazyMeta(accessible.nested.ping)).toEqual({ prefix: '/prefix' })
  expect(getLazyMeta(accessible.nested.pong)).toEqual({ prefix: '/prefix' })
})

describe('enhanceContractRouter', async () => {
  it('works', async () => {
    const errorMap = {
      INVALID: { message: 'INVALID' },
      OVERRIDE: { message: 'OVERRIDE' },
    }

    const enhanced = enhanceContractRouter(router, { errorMap, prefix: '/enhanced', tags: ['enhanced'] })

    expect((await (unlazy(enhanced.ping))).default['~orpc'].errorMap).toEqual({ ...errorMap, ...ping['~orpc'].errorMap })
    expect((await (unlazy(enhanced.ping))).default['~orpc'].route).toEqual(enhanceRoute(ping['~orpc'].route, { prefix: '/enhanced', tags: ['enhanced'] }))
    expect(getLazyMeta(enhanced.ping)).toEqual({ prefix: '/enhanced' })

    expect(enhanced.pong['~orpc'].errorMap).toEqual({ ...errorMap, ...pong['~orpc'].errorMap })
    expect(enhanced.pong['~orpc'].route).toEqual(enhanceRoute(pong['~orpc'].route, { prefix: '/enhanced', tags: ['enhanced'] }))

    expect((await (unlazy(enhanced.nested.ping))).default['~orpc'].errorMap).toEqual({ ...errorMap, ...ping['~orpc'].errorMap })
    expect((await (unlazy(enhanced.nested.ping))).default['~orpc'].route).toEqual(enhanceRoute(ping['~orpc'].route, { prefix: '/enhanced', tags: ['enhanced'] }))
    expect(getLazyMeta(enhanced.nested.ping)).toEqual({ prefix: '/enhanced' })

    expect((await (unlazy(enhanced.nested.pong))).default['~orpc'].errorMap).toEqual({ ...errorMap, ...pong['~orpc'].errorMap })
    expect((await (unlazy(enhanced.nested.pong))).default['~orpc'].route).toEqual(enhanceRoute(pong['~orpc'].route, { prefix: '/enhanced', tags: ['enhanced'] }))
    expect(getLazyMeta(enhanced.nested.pong)).toEqual({ prefix: '/enhanced' })
  })

  it('can merge lazy prefix', async () => {
    const enhanced = enhanceContractRouter(
      enhanceContractRouter(router, { errorMap: {}, prefix: '/enhanced', tags: undefined }),
      { errorMap: {}, prefix: '/prefix', tags: undefined },
    )

    expect(getLazyMeta(enhanced.ping)).toEqual({ prefix: '/prefix/enhanced' })
    expect(getLazyMeta(enhanced.nested.ping)).toEqual({ prefix: '/prefix/enhanced' })
    expect(getLazyMeta(enhanced.nested.pong)).toEqual({ prefix: '/prefix/enhanced' })
  })
})
