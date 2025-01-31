import type { NestedClient } from './client'
import type { ContractRouterClient } from './router-client'
import { ping, pong } from '../tests/shared'

const router = {
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
}

describe('ContractRouterClient', () => {
  it('is a NestedClient', () => {
    expectTypeOf<ContractRouterClient<typeof router, unknown>>().toMatchTypeOf<NestedClient<unknown>>()
    expectTypeOf<ContractRouterClient<typeof router, 'invalid'>>().not.toMatchTypeOf<NestedClient<unknown>>()
  })
})
