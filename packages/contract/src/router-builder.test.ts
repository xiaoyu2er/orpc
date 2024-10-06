import { z } from 'zod'
import { initORPCContract } from '.'

test('prefix method', () => {
  expect(initORPCContract.prefix('/1').prefix('/2').zz$crb.prefix).toEqual(
    '/1/2',
  )
})

test('define a router', () => {
  const orpc = initORPCContract
  const ping = orpc.route({ method: 'GET', path: '/ping' })
  const pong = orpc.input(z.object({ id: z.string() }))

  const router = orpc.router({
    ping,
    pong,

    internal: orpc.prefix('/internal').router({
      ping: ping,
      pong: pong,

      nested: {
        ping: ping,
      },
    }),
  })

  expect(router.ping.zz$cp.path).toEqual('/ping')
  expect(router.pong.zz$cp.path).toEqual(undefined)

  expect(router.internal.ping.zz$cp.path).toEqual('/internal/ping')
  expect(router.internal.pong.zz$cp.path).toEqual(undefined)
  expect(router.internal.nested.ping.zz$cp.path).toEqual('/internal/ping')
})
