import type { Lazy } from './lazy'
import type { AccessibleLazyRouter } from './router-accessible-lazy'
import { ping, pong } from '../tests/shared'

const router = {
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
}

it('AccessibleLazyRouter', () => {
  const accessible = {} as AccessibleLazyRouter<typeof router>

  expectTypeOf(accessible.ping).toEqualTypeOf <Lazy<typeof ping>>()
  expectTypeOf(accessible.pong).toEqualTypeOf <Lazy<typeof pong>>()
  expectTypeOf(accessible.nested.ping).toEqualTypeOf <Lazy<typeof ping>>()
  expectTypeOf(accessible.nested.pong).toEqualTypeOf <Lazy<typeof pong>>()
})
