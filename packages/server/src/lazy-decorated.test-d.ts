import type { Context } from './context'
import type { Lazy } from './lazy'
import type { DecoratedLazy } from './lazy-decorated'
import type { ANY_PROCEDURE, Procedure } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { ANY_ROUTER } from './router'
import { z } from 'zod'
import { lazy } from './lazy'
import { decorateLazy } from './lazy-decorated'

const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })

const ping = {} as Procedure<Context, { db: string }, undefined, typeof schema, { val: string }, Record<never, never>>
const pong = {} as DecoratedProcedure<Context, Context, typeof schema, undefined, unknown, Record<never, never>>

const lazyPing = lazy(() => Promise.resolve({ default: ping }))
const lazyPong = lazy(() => Promise.resolve({ default: pong }))

const router = {
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
}

const lazyRouter = lazy(() => Promise.resolve({
  default: {
    ping: lazyPing,
    pong,
    nested: lazy(() => Promise.resolve({
      default: {
        ping,
        pong: lazyPong,
      },
    })),
  },
}))

describe('DecoratedLazy', () => {
  it('with procedure', () => {
    const decorated = {} as DecoratedLazy<typeof ping>

    expectTypeOf(decorated).toMatchTypeOf<Lazy<ANY_PROCEDURE>>()
  })

  it('with router', () => {
    const decorated = {} as DecoratedLazy<typeof router>

    expectTypeOf(decorated).toMatchTypeOf<Lazy<ANY_ROUTER>>()
    expectTypeOf({ router: decorated }).toMatchTypeOf<ANY_ROUTER>()

    expectTypeOf(decorated.ping).toMatchTypeOf<Lazy<ANY_PROCEDURE>>()
    expectTypeOf(decorated.pong).toMatchTypeOf<Lazy<ANY_PROCEDURE>>()

    expectTypeOf(decorated.nested).toMatchTypeOf<Lazy<ANY_ROUTER>>()
    expectTypeOf({ router: decorated.nested }).toMatchTypeOf<ANY_ROUTER>()

    expectTypeOf(decorated.nested.ping).toMatchTypeOf<Lazy<ANY_PROCEDURE>>()
    expectTypeOf(decorated.nested.pong).toMatchTypeOf<Lazy<ANY_PROCEDURE>>()
  })

  it('flat lazy', () => {
    expectTypeOf<DecoratedLazy<typeof lazyPing>>().toEqualTypeOf<DecoratedLazy<typeof ping>>()
    expectTypeOf<DecoratedLazy<typeof lazyPong>>().toEqualTypeOf<DecoratedLazy<typeof pong>>()
    expectTypeOf<DecoratedLazy<Lazy<typeof router>>>().toEqualTypeOf<DecoratedLazy<typeof router>>()

    expectTypeOf<DecoratedLazy<typeof lazyRouter>['ping']>().toEqualTypeOf<DecoratedLazy<typeof router>['ping']>()
    expectTypeOf<DecoratedLazy<typeof lazyRouter>['pong']>().toEqualTypeOf<DecoratedLazy<typeof router>['pong']>()
    expectTypeOf<DecoratedLazy<typeof lazyRouter>['nested']['ping']>().toEqualTypeOf<DecoratedLazy<typeof router>['nested']['ping']>()
    expectTypeOf<DecoratedLazy<typeof lazyRouter>['nested']['pong']>().toEqualTypeOf<DecoratedLazy<typeof router>['nested']['pong']>()

    // @ts-expect-error - lazy loader is diff
    expectTypeOf<DecoratedLazy<typeof lazyRouter>['nested']>().toEqualTypeOf<DecoratedLazy<typeof router>['nested']>()
  })
})

it('decorateLazy', () => {
  expectTypeOf(decorateLazy(lazyPing)).toEqualTypeOf<DecoratedLazy<typeof ping>>()
  expectTypeOf(decorateLazy(lazyPong)).toEqualTypeOf<DecoratedLazy<typeof pong>>()
  expectTypeOf(decorateLazy(lazy(() => Promise.resolve({ default: router })))).toEqualTypeOf<DecoratedLazy<typeof router>>()

  // @ts-expect-error - invalid lazy
  decorateLazy(ping)

  // @ts-expect-error - invalid lazy
  decorateLazy(router)
})
