import { ioc } from '@orpc/contract'
import { z } from 'zod'
import { type RouterWithContract, ios, toContractRouter } from '.'

it('require procedure match context', () => {
  const os = ios.context<{ auth: boolean; userId: string }>()

  os.router({
    ping: ios.context<{ auth: boolean }>().handler(() => {
      return { pong: 'ping' }
    }),

    // @ts-expect-error userId is not match
    ping2: ios.context<{ userId: number }>().handler(() => {
      return { name: 'dinwwwh' }
    }),

    nested: {
      ping: ios.context<{ auth: boolean }>().handler(() => {
        return { pong: 'ping' }
      }),

      // @ts-expect-error userId is not match
      ping2: ios.context<{ userId: number }>().handler(() => {
        return { name: 'dinwwwh' }
      }),
    },
  })
})

it('require match contract', () => {
  const pingContract = ioc.route({ method: 'GET', path: '/ping' })
  const pongContract = ioc.input(z.string()).output(z.string())
  const ping = ios.contract(pingContract).handler(() => {
    return 'ping'
  })
  const pong = ios.contract(pongContract).handler(() => {
    return 'pong'
  })

  const contract = ioc.router({
    ping: pingContract,
    pong: pongContract,

    nested: ioc.router({
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

    nested: ios.contract(contract.nested).router({
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
      pong: ios.handler(() => 'ping'),
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
  const p1 = ioc.input(z.string()).output(z.string())
  const p2 = ioc.output(z.string())
  const p3 = ioc.route({ method: 'GET', path: '/test' })

  const contract = ioc.router({
    p1: p1,

    nested: ioc.router({
      p2: p2,
    }),

    nested2: {
      p3: p3,
    },
  })

  const os = ios.contract(contract)

  const router = os.router({
    p1: os.p1.handler(() => {
      return 'dinwwwh'
    }),

    nested: os.nested.router({
      p2: os.nested.p2.handler(() => {
        return 'dinwwwh'
      }),
    }),

    nested2: {
      p3: os.nested2.p3.handler(() => {
        return 'dinwwwh'
      }),
    },
  })

  expect(toContractRouter(router)).toEqual(contract)
  expect(toContractRouter(contract)).toEqual(contract)
})
