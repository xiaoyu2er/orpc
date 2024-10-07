import { z } from 'zod'
import { initORPC } from '.'
import { RouterBuilder } from './router-builder'

const builder = new RouterBuilder<undefined, undefined>({})
const ping = initORPC
  .route({ method: 'GET', path: '/ping' })
  .handler(() => 'ping')
const pong = initORPC
  .output(z.object({ id: z.string() }))
  .handler(() => ({ id: '123' }))

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
      .router({ ping: ping, pong })

    expect(router.ping.zz$p.contract.zz$cp.path).toEqual('/api/users/ping')
    expect(router.pong.zz$p.contract.zz$cp.path).toEqual(undefined)
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
    const router = builder.use(mid1).use(mid2).router({ ping: ping, pong })

    expect(router.ping.zz$p.middlewares).toEqual([mid1, mid2])
    expect(router.pong.zz$p.middlewares).toEqual([mid1, mid2])
  })
})
