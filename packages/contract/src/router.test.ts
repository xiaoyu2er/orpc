import type { DecoratedRouter } from '@orpc/server'
import { z } from 'zod'
import { initORPCContract } from '.'
import { ContractProcedure } from './procedure'
import {
  type DecoratedContractRouter,
  decorateContractRouter,
  eachContractRouterLeaf,
} from './router'

describe('prefix method', () => {
  const orpc = initORPCContract

  const procedure1 = orpc.route({
    method: 'GET',
    path: '/',
  })

  const procedure2 = orpc
    .route({
      method: 'GET',
      path: '/abc//',
    })
    .output(z.object({}))

  const router = decorateContractRouter({
    ping: procedure1,
    prefix: procedure2,
    nested: {
      prefix: procedure2,
    },
    nested2: decorateContractRouter({
      ping: procedure2,
    }),
  })

  it('works (and standardize path)', () => {
    const r = router.prefix('/prefix//')
    const p_procedure1 = procedure1.prefix('/prefix')
    const p_procedure2 = procedure2.prefix('/prefix')

    expectTypeOf(r).toMatchTypeOf<
      DecoratedContractRouter<{
        ping: typeof p_procedure1
        prefix: typeof p_procedure2
        nested: {
          prefix: typeof p_procedure2
        }
        nested2: {
          ping: typeof p_procedure2
        }
      }>
    >()

    expect(r.ping.__cp.path).toBe('/prefix')
    expect(r.prefix.__cp.path).toBe('/prefix/abc')
    expect(r.nested.prefix.__cp.path).toBe('/prefix/abc')
    expect(r.nested2.ping.__cp.path).toBe('/prefix/abc')

    expect(
      orpc.router({ ping: procedure2 }).prefix('/prefix').ping.__cp.path,
    ).toBe('/prefix/abc')
  })

  it('should deep copy router', () => {
    expect(router.prefix('/prefix')).not.toBe(router)
    expect(router.prefix('/prefix')).not.toBe(router)
    expect(router.prefix('/prefix').ping).not.toBe(router.ping)
    expect(router.prefix('/prefix').prefix).not.toBe(router.prefix)
    expect(router.prefix('/prefix').nested.prefix).not.toBe(
      router.nested.prefix,
    )
  })
})

test('each router leaf', () => {
  const orpc = initORPCContract

  const router = decorateContractRouter({
    ping: orpc.route({
      method: 'GET',
      path: '/ping',
    }),
    user: {
      find: orpc.route({
        method: 'GET',
        path: '/users/{id}',
      }),
    },
  })

  const calls: string[] = []

  eachContractRouterLeaf(router, (procedure, path) => {
    calls.push(path.join('.'))
  })

  expect(calls).toEqual(['ping', 'user.find'])
})
