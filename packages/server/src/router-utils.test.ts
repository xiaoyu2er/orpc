import { ping, pingMiddleware, pong, router } from '../tests/shared'
import { isLazy, unlazy } from './lazy'
import { isProcedure } from './procedure'
import { adaptRouter, getRouterChild } from './router-utils'

it('adaptRouter', () => {
  const mid = vi.fn()

  const extraErrorMap = { EXTRA: {} }
  const adapted = adaptRouter(router, {
    errorMap: extraErrorMap,
    middlewares: [mid, pingMiddleware],
    prefix: '/adapt',
    tags: ['adapt'],
  })

  const satisfyAdaptedPing = ({ default: adaptedPing }: any) => {
    expect(adaptedPing).toSatisfy(isProcedure)
    expect(adaptedPing).not.toBe(ping)
    expect(adaptedPing['~orpc']).toMatchObject({
      ...ping['~orpc'],
      errorMap: { ...ping['~orpc'].errorMap, ...extraErrorMap },
      middlewares: [mid, ...ping['~orpc'].middlewares],
      route: {
        ...ping['~orpc'].route,
        tags: ['adapt'],
        path: '/adapt/base',
      },
      inputValidationIndex: 2,
      outputValidationIndex: 2,
    })

    return true
  }

  const satisfyAdaptedPong = ({ default: adaptedPong }: any) => {
    expect(adaptedPong).toSatisfy(isProcedure)
    expect(adaptedPong).not.toBe(pong)
    expect(adaptedPong['~orpc']).toEqual({
      ...pong['~orpc'],
      errorMap: { ...pong['~orpc'].errorMap, ...extraErrorMap },
      middlewares: [mid, pingMiddleware],
      route: {
        tags: ['adapt'],
      },
      inputValidationIndex: 2,
      outputValidationIndex: 2,
    })

    return true
  }

  expect(adapted.ping).toSatisfy(isLazy)
  expect(unlazy(adapted.ping)).resolves.toSatisfy(satisfyAdaptedPing)

  expect(adapted.nested.ping).toSatisfy(isLazy)
  expect(unlazy(adapted.nested.ping)).resolves.toSatisfy(satisfyAdaptedPing)

  expect({ default: adapted.pong }).toSatisfy(satisfyAdaptedPong)

  expect(adapted.nested.pong).toSatisfy(isLazy)
  expect(unlazy(adapted.nested.pong)).resolves.toSatisfy(satisfyAdaptedPong)
})

it('getRouterChild', () => {
  expect(getRouterChild(router, 'pong')).toEqual(pong)
  expect(getRouterChild(router, 'pong', 'not-exist')).toEqual(undefined)

  expect(getRouterChild(router, 'ping')).toSatisfy(isLazy)
  expect(unlazy(getRouterChild(router, 'ping'))).resolves.toEqual({ default: ping })

  expect(getRouterChild(router, 'ping', 'not-exist')).toSatisfy(isLazy)
  expect(unlazy(getRouterChild(router, 'ping', 'not-exist'))).resolves.toEqual({ default: undefined })

  expect(getRouterChild(router, 'nested', 'pong')).toSatisfy(isLazy)
  expect(unlazy(getRouterChild(router, 'nested', 'pong'))).resolves.toEqual({ default: pong })
})
