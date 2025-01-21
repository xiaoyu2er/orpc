import { baseErrorMap, ping, pong } from '../tests/shared'
import { adaptRoute } from './route-utils'
import { adaptContractRouter } from './router-utils'

const router = {
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
}

it('adaptContractRouter', () => {
  const adapted = adaptContractRouter(router, baseErrorMap, '/adapt', ['adapt'])

  expect(adapted.ping['~orpc'].errorMap).toEqual({ ...ping['~orpc'].errorMap, ...baseErrorMap })
  expect(adapted.ping['~orpc'].route).toEqual(adaptRoute(ping['~orpc'].route, '/adapt', ['adapt']))

  expect(adapted.pong['~orpc'].errorMap).toEqual({ ...pong['~orpc'].errorMap, ...baseErrorMap })
  expect(adapted.pong['~orpc'].route).toEqual(adaptRoute(pong['~orpc'].route, '/adapt', ['adapt']))

  expect(adapted.nested.ping['~orpc'].errorMap).toEqual({ ...ping['~orpc'].errorMap, ...baseErrorMap })
  expect(adapted.nested.ping['~orpc'].route).toEqual(adaptRoute(ping['~orpc'].route, '/adapt', ['adapt']))

  expect(adapted.nested.pong['~orpc'].errorMap).toEqual({ ...pong['~orpc'].errorMap, ...baseErrorMap })
  expect(adapted.nested.pong['~orpc'].route).toEqual(adaptRoute(pong['~orpc'].route, '/adapt', ['adapt']))
})
