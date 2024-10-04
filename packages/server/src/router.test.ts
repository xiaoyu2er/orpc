import { initORPCContract } from '@orpc/contract'
import { z } from 'zod'
import {
  type DecoratedRouter,
  initORPC,
  isProcedure,
  toContractRouter,
} from '.'

it('require procedure match context', () => {
  const orpc = initORPC.context<{ auth: boolean; userId: string }>()

  orpc.router({
    ping: initORPC.context<{ auth: boolean }>().handler(() => {
      return { pong: 'ping' }
    }),

    // @ts-expect-error userId is not match
    ping2: initORPC.context<{ userId: number }>().handler(() => {
      return { name: 'dinwwwh' }
    }),

    ping3: orpc.handler(() => {
      return { name: 'dinwwwh' }
    }),
  })
})

it('toContractRouter', () => {
  const p1 = initORPCContract.input(z.string()).output(z.string())
  const p2 = initORPCContract.output(z.string())
  const p3 = initORPCContract.route({ method: 'GET', path: '/test' })

  const contract = initORPCContract.router({
    p1: p1,

    nested: initORPCContract.router({
      p2: p2,
    }),

    nested2: {
      p3: p3,
    },
  })

  const orpc = initORPC.contract(contract)

  const router = orpc.router({
    p1: orpc.p1.handler(() => {
      return 'dinwwwh'
    }),

    nested: orpc.nested.router({
      p2: orpc.nested.p2.handler(() => {
        return 'dinwwwh'
      }),
    }),

    nested2: {
      p3: orpc.nested2.p3.handler(() => {
        return 'dinwwwh'
      }),
    },
  })

  expect(toContractRouter(router)).toEqual(contract)
  expect(toContractRouter(contract)).toEqual(contract)
})

describe('decorateRouter', () => {
  const orpc = initORPC.context<{ auth: boolean }>()
  const p1 = orpc.route({ method: 'GET', path: '/test' }).handler(() => {
    return 'dinwwwh'
  })
  const p2 = orpc.handler(() => {
    return 'dinwwwh'
  })

  const router = orpc.router({
    ping: p1,
    nested: {
      ping: p2,
    },
    prefix: orpc.router({
      ping: p1,
      prefix: p1,
    }),
  })

  const router2 = orpc.router({
    ping: p1,
    nested: {
      ping: p2,
    },
  })

  it('contain valid procedure', () => {
    expect(router.ping).toSatisfy(isProcedure)
    expect(router.prefix.prefix).toSatisfy(isProcedure)
    expect(router).not.toSatisfy(isProcedure)
    expect(router.prefix).not.toSatisfy(isProcedure)
    expect(router.prefix.prefix.prefix).not.toSatisfy(isProcedure)
    expect(router2.prefix).not.toSatisfy(isProcedure)
  })

  it('prefix', () => {
    const pp1 = p1.prefix('/test')
    const pp2 = p2.prefix('/test')

    expectTypeOf(router.prefix('/test')).toMatchTypeOf<
      DecoratedRouter<{
        ping: typeof pp1
        nested: {
          ping: typeof pp2
        }
        prefix: {
          ping: typeof pp1
          prefix: typeof pp1
        }
      }>
    >()

    expect(router.prefix('/test')).toMatchObject({
      ping: p1.prefix('/test'),
      nested: {
        ping: p2.prefix('/test'),
      },
    })

    expect(router.prefix('/test').prefix.ping.__p).toMatchObject(
      p1.prefix('/test').__p,
    )
    expect(router.prefix('/test').prefix.prefix.__p).toMatchObject(
      p1.prefix('/test').__p,
    )
  })

  it('prefix: deep clone', () => {
    const router2 = router.prefix('/test')

    expect(router2).not.toBe(router)
    expect(router2.ping).not.toBe(router.ping)
    expect(router2.nested).not.toBe(router.nested)
    expect(router2.nested.ping).not.toBe(router.nested.ping)
    expect(router2.prefix).not.toBe(router.prefix)
    expect(router2.prefix.prefix).not.toBe(router.prefix.prefix)
  })

  it('prefix: cannot prefix when approach is contract-first', () => {
    const contract = initORPCContract.router({
      ping: initORPCContract.output(z.string()),
    })

    const router = initORPC.contract(contract).router({
      ping: initORPC.contract(contract.ping).handler(() => {
        return 'dinwwwh'
      }),
    })

    // @ts-expect-error prefix does not exists
    router.prefix

    expect(typeof (router as any).prefix).toBe('undefined')
  })
})
