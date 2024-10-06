import { initORPCContract } from '@orpc/contract'
import { z } from 'zod'
import { type RouterWithContract, initORPC, toContractRouter } from '.'

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

    nested: {
      ping: initORPC.context<{ auth: boolean }>().handler(() => {
        return { pong: 'ping' }
      }),

      // @ts-expect-error userId is not match
      ping2: initORPC.context<{ userId: number }>().handler(() => {
        return { name: 'dinwwwh' }
      }),
    },
  })
})

it('require match contract', () => {
  const pingContract = initORPCContract.route({ method: 'GET', path: '/ping' })
  const pongContract = initORPCContract.input(z.string()).output(z.string())
  const ping = initORPC.contract(pingContract).handler(() => {
    return 'ping'
  })
  const pong = initORPC.contract(pongContract).handler(() => {
    return 'pong'
  })

  const contract = initORPCContract.router({
    ping: pingContract,
    pong: pongContract,

    nested: initORPCContract.router({
      ping: pingContract,
      pong: pongContract,
    }),
  })

  const _1: RouterWithContract<undefined, typeof contract> = {
    ping,
    pong,

    nested: {
      ping,
      pong,
    },
  }

  const _2: RouterWithContract<undefined, typeof contract> = {
    ping,
    pong,

    nested: initORPC.contract(contract.nested).router({
      ping,
      pong,
    }),
  }

  const _3: RouterWithContract<undefined, typeof contract> = {
    ping,
    pong,

    // @ts-expect-error missing nested.ping
    nested: {
      pong,
    },
  }

  const _4: RouterWithContract<undefined, typeof contract> = {
    ping,
    pong,

    nested: {
      ping,
      // @ts-expect-error nested.pong is mismatch
      pong: initORPC.handler(() => 'ping'),
    },
  }

  // @ts-expect-error missing pong
  const _5: RouterWithContract<undefined, typeof contract> = {
    ping,

    nested: {
      ping,
      pong,
    },
  }
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
