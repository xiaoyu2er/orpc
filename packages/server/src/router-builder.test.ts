import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { decorateProcedure, isProcedure, os, Procedure } from '.'
import { RouterBuilder } from './router-builder'

const builder = new RouterBuilder<undefined, undefined>({})
const ping = os
  .route({ method: 'GET', path: '/ping', tags: ['ping'] })
  .func(() => 'ping')
const pong = os
  .output(z.object({ id: z.string() }))
  .func(() => ({ id: '123' }))

describe('prefix', () => {
  it('chainable prefix', () => {
    expect(builder.prefix('/1').prefix('/2').prefix('/3').zz$rb.prefix).toEqual(
      '/1/2/3',
    )
  })

  it('router', () => {
    const router = builder
      .prefix('/api')
      .prefix('/users')
      .router({ ping, pong })

    expect(router.ping.zz$p.contract.zz$cp.path).toEqual('/api/users/ping')
    expect(router.pong.zz$p.contract.zz$cp.path).toEqual(undefined)
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

  it('router', () => {
    const router = builder
      .tags('api')
      .tags('users')
      .router({ ping, pong })

    expect(router.ping.zz$p.contract.zz$cp.tags).toEqual([
      'ping',
      'api',
      'users',
    ])
    expect(router.pong.zz$p.contract.zz$cp.tags).toEqual(['api', 'users'])
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

  it('router', () => {
    const router = builder.use(mid1).use(mid2).router({ ping, pong })

    expect(router.ping.zz$p.middlewares).toEqual([mid1, mid2])
    expect(router.pong.zz$p.middlewares).toEqual([mid1, mid2])
  })

  it('decorate items', () => {
    const ping = new Procedure({
      contract: new ContractProcedure({
        InputSchema: undefined,
        OutputSchema: undefined,
      }),
      func: () => {},
    })

    const decorated = decorateProcedure({
      zz$p: {
        contract: new ContractProcedure({
          InputSchema: undefined,
          OutputSchema: undefined,
        }),
        func: () => {},
      },
    })

    const router = builder.router({ ping, nested: { ping } })

    expectTypeOf(router).toEqualTypeOf<{
      ping: typeof decorated
      nested: { ping: typeof decorated }
    }>()

    expect(router.ping).satisfies(isProcedure)
    expect(router.nested.ping).satisfies(isProcedure)
  })
})
