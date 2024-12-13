import { oc } from '@orpc/contract'
import { z } from 'zod'
import { os, type RouterWithContract } from '.'

it('require procedure match context', () => {
  const osw = os.context<{ auth: boolean, userId: string }>()

  osw.router({
    ping: osw.context<{ auth: boolean }>().func(() => {
      return { pong: 'ping' }
    }),

    // @ts-expect-error userId is not match
    ping2: osw.context<{ userId: number }>().func(() => {
      return { name: 'unnoq' }
    }),

    nested: {
      ping: osw.context<{ auth: boolean }>().func(() => {
        return { pong: 'ping' }
      }),

      // @ts-expect-error userId is not match
      ping2: osw.context<{ userId: number }>().func(() => {
        return { name: 'unnoq' }
      }),
    },
  })
})

it('require match contract', () => {
  const pingContract = oc.route({ method: 'GET', path: '/ping' })
  const pongContract = oc.input(z.string()).output(z.string())
  const ping = os.contract(pingContract).func(() => {
    return 'ping'
  })
  const pong = os.contract(pongContract).func(() => {
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
      pong: os.func(() => 'ping'),
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
