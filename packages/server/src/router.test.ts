import { oc } from '@orpc/contract'
import { z } from 'zod'
import { os, type RouterWithContract, toContractRouter } from '.'

it('require procedure match context', () => {
  const osw = os.context<{ auth: boolean, userId: string }>()

  osw.router({
    ping: osw.context<{ auth: boolean }>().handler(() => {
      return { pong: 'ping' }
    }),

    // @ts-expect-error userId is not match
    ping2: osw.context<{ userId: number }>().handler(() => {
      return { name: 'unnoq' }
    }),

    nested: {
      ping: osw.context<{ auth: boolean }>().handler(() => {
        return { pong: 'ping' }
      }),

      // @ts-expect-error userId is not match
      ping2: osw.context<{ userId: number }>().handler(() => {
        return { name: 'unnoq' }
      }),
    },
  })
})

it('require match contract', () => {
  const pingContract = oc.route({ method: 'GET', path: '/ping' })
  const pongContract = oc.input(z.string()).output(z.string())
  const ping = os.contract(pingContract).handler(() => {
    return 'ping'
  })
  const pong = os.contract(pongContract).handler(() => {
    return 'pong'
  })

  const contract = oc.router({
    ping: pingContract,
    pong: pongContract,

    nested: oc.router({
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

    nested: os.contract(contract.nested).router({
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
      pong: os.handler(() => 'ping'),
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
  const p1 = oc.input(z.string()).output(z.string())
  const p2 = oc.output(z.string())
  const p3 = oc.route({ method: 'GET', path: '/test' })

  const contract = oc.router({
    p1,

    nested: oc.router({
      p2,
    }),

    nested2: {
      p3,
    },
  })

  const osw = os.contract(contract)

  const router = osw.router({
    p1: osw.p1.handler(() => {
      return 'unnoq'
    }),

    nested: osw.nested.router({
      p2: osw.nested.p2.handler(() => {
        return 'unnoq'
      }),
    }),

    nested2: {
      p3: osw.nested2.p3.handler(() => {
        return 'unnoq'
      }),
    },
  })

  expect(toContractRouter(router)).toEqual(contract)
  expect(toContractRouter(contract)).toEqual(contract)
})
