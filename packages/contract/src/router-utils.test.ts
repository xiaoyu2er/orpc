import { ping, pong, router } from '../tests/shared'
import { enhanceRoute } from './route'
import { enhanceContractRouter } from './router-utils'

it('enhanceContractRouter', async () => {
  const errorMap = {
    INVALID: { message: 'INVALID' },
    OVERRIDE: { message: 'OVERRIDE' },
  }
  const options = { errorMap, prefix: '/enhanced', tags: ['enhanced'] } as const

  const enhanced = enhanceContractRouter(router, options)

  expect(enhanced.ping['~orpc'].errorMap).toEqual({ ...errorMap, ...ping['~orpc'].errorMap })
  expect(enhanced.ping['~orpc'].route).toEqual(enhanceRoute(ping['~orpc'].route, options))

  expect(enhanced.pong['~orpc'].errorMap).toEqual({ ...errorMap, ...pong['~orpc'].errorMap })
  expect(enhanced.pong['~orpc'].route).toEqual(enhanceRoute(pong['~orpc'].route, options))

  expect(enhanced.nested.ping['~orpc'].errorMap).toEqual({ ...errorMap, ...ping['~orpc'].errorMap })
  expect(enhanced.nested.ping['~orpc'].route).toEqual(enhanceRoute(ping['~orpc'].route, options))

  expect(enhanced.nested.pong['~orpc'].errorMap).toEqual({ ...errorMap, ...pong['~orpc'].errorMap })
  expect(enhanced.nested.pong['~orpc'].route).toEqual(enhanceRoute(pong['~orpc'].route, options))
})
