import { ping, pong } from '../tests/shared'
import { adaptRoute } from './route'
import { adaptContractRouter } from './router'

const router = {
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
}

it('adaptContractRouter', () => {
  const errorMap = {
    INVALID: { message: 'INVALID' },
    OVERRIDE: { message: 'OVERRIDE' },
  }
  const adapted = adaptContractRouter(router, { errorMap, prefix: '/adapt', tags: ['adapt'] })

  expect(adapted.ping['~orpc'].errorMap).toEqual({ ...errorMap, ...ping['~orpc'].errorMap })
  expect(adapted.ping['~orpc'].route).toEqual(adaptRoute(ping['~orpc'].route, { prefix: '/adapt', tags: ['adapt'] }))

  expect(adapted.pong['~orpc'].errorMap).toEqual({ ...errorMap, ...pong['~orpc'].errorMap })
  expect(adapted.pong['~orpc'].route).toEqual(adaptRoute(pong['~orpc'].route, { prefix: '/adapt', tags: ['adapt'] }))

  expect(adapted.nested.ping['~orpc'].errorMap).toEqual({ ...errorMap, ...ping['~orpc'].errorMap })
  expect(adapted.nested.ping['~orpc'].route).toEqual(adaptRoute(ping['~orpc'].route, { prefix: '/adapt', tags: ['adapt'] }))

  expect(adapted.nested.pong['~orpc'].errorMap).toEqual({ ...errorMap, ...pong['~orpc'].errorMap })
  expect(adapted.nested.pong['~orpc'].route).toEqual(adaptRoute(pong['~orpc'].route, { prefix: '/adapt', tags: ['adapt'] }))
})
