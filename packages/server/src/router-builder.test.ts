import type { DecoratedLazy } from './lazy'
import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { decorateProcedure, isProcedure, os, Procedure } from '.'
import { createLazy, isLazy, LAZY_LOADER_SYMBOL } from './lazy'
import { LAZY_ROUTER_PREFIX_SYMBOL, RouterBuilder } from './router-builder'

const builder = new RouterBuilder<undefined, undefined>({})
const ping = os
  .route({ method: 'GET', path: '/ping', tags: ['ping'] })
  .func(() => 'ping')
const pong = os
  .output(z.object({ id: z.string() }))
  .func(() => ({ id: '123' }))

const lazy = os.lazy(() => Promise.resolve({
  default: os.route({
    method: 'GET',
    path: '/lazy',
    tags: ['lazy'],
  }).func(() => 'lazy'),
}))

const lazyRouter = os.lazy(() => Promise.resolve({
  default: {
    lazy,
    lazyRouter: os.lazy(() => Promise.resolve({ default: { lazy } })),
  },
}))

describe('prefix', () => {
  it('chainable prefix', () => {
    expect(builder.prefix('/1').prefix('/2').prefix('/3').zz$rb.prefix).toEqual(
      '/1/2/3',
    )
  })

  it('router', async () => {
    const router = builder
      .prefix('/api')
      .prefix('/users')
      .router({ ping, pong, lazy: builder.lazy(() => Promise.resolve({ default: {
        ping,
        lazy: os.route({ method: 'GET', path: '/lazy' }).func(() => 'lazy'),
      } })) })

    expect(router.ping.zz$p.contract.zz$cp.path).toEqual('/api/users/ping')
    expect(router.pong.zz$p.contract.zz$cp.path).toEqual(undefined)
    expect((await router.lazy.lazy[LAZY_LOADER_SYMBOL]()).default.zz$p.contract.zz$cp.path).toEqual('/api/users/lazy')
    expect((await (router.lazy as any)[LAZY_LOADER_SYMBOL]()).default.lazy.zz$p.contract.zz$cp.path).toEqual('/api/users/lazy')
    expect((router.lazy as any)[LAZY_ROUTER_PREFIX_SYMBOL]).toEqual('/api/users')
    expect((router.lazy.lazy as any)[LAZY_ROUTER_PREFIX_SYMBOL]).toEqual('/api/users')
  })
})

describe('tags', () => {
  it('chainable tags', () => {
    expect(builder.tags('1', '2').tags('3').tags('4').zz$rb.tags).toEqual([
      '1',
      '2',
      '3',
      '4',
    ])
  })

  it('router', async () => {
    const router = builder
      .tags('api')
      .tags('users')
      .router({ ping, pong, lazy, lazyRouter })

    expect(router.ping.zz$p.contract.zz$cp.tags).toEqual([
      'ping',
      'api',
      'users',
    ])
    expect(router.pong.zz$p.contract.zz$cp.tags).toEqual(['api', 'users'])

    expect((await (router.lazy[LAZY_LOADER_SYMBOL]())).default.zz$p.contract.zz$cp.tags).toEqual([
      'lazy',
      'api',
      'users',
    ])
    expect((await (router.lazyRouter.lazy[LAZY_LOADER_SYMBOL]())).default.zz$p.contract.zz$cp.tags).toEqual([
      'lazy',
      'api',
      'users',
    ])
    expect((await (router.lazyRouter.lazyRouter.lazy[LAZY_LOADER_SYMBOL]())).default.zz$p.contract.zz$cp.tags).toEqual([
      'lazy',
      'api',
      'users',
    ])
  })
})

describe('middleware', () => {
  const mid1 = vi.fn()
  const mid2 = vi.fn()
  const mid3 = vi.fn()

  it('chainable middleware', () => {
    expect(builder.use(mid1).use(mid2).use(mid3).zz$rb.middlewares).toEqual([
      mid1,
      mid2,
      mid3,
    ])
  })

  it('router', async () => {
    const router = builder.use(mid1).use(mid2).router({ ping, pong, lazy, lazyRouter })

    expect(router.ping.zz$p.middlewares).toEqual([mid1, mid2])
    expect(router.pong.zz$p.middlewares).toEqual([mid1, mid2])

    expect((await (router.lazy[LAZY_LOADER_SYMBOL]())).default.zz$p.middlewares).toEqual([mid1, mid2])
    expect((await (router.lazyRouter.lazy[LAZY_LOADER_SYMBOL]())).default.zz$p.middlewares).toEqual([mid1, mid2])
    expect((await (router.lazyRouter.lazyRouter.lazy[LAZY_LOADER_SYMBOL]())).default.zz$p.middlewares).toEqual([mid1, mid2])
  })

  it('decorate items', () => {
    const ping = new Procedure({
      contract: new ContractProcedure({
        InputSchema: undefined,
        OutputSchema: undefined,
      }),
      func: () => { },
    })

    const decorated = decorateProcedure({
      zz$p: {
        contract: new ContractProcedure({
          InputSchema: undefined,
          OutputSchema: undefined,
        }),
        func: () => { },
      },
    })

    const lazy = createLazy(() => Promise.resolve({ default: ping }))

    const router = builder.router({ ping, nested: { ping }, lazy })

    expectTypeOf(router).toEqualTypeOf<{
      ping: typeof decorated
      nested: { ping: typeof decorated }
      lazy: DecoratedLazy<typeof ping>
    }>()

    expect(router.ping).satisfies(isProcedure)
    expect(router.nested.ping).satisfies(isProcedure)
    expect(router.lazy).satisfies(isLazy)
  })
})
