import type { Caller } from '@orpc/server'
import { oc } from '@orpc/contract'
import { os } from '@orpc/server'
import { z } from 'zod'
import { createRouterClient } from './router'

describe('router client', () => {
  const pingContract = oc
    .input(z.object({ in: z.string() }).transform(i => i.in))
    .output(z.string().transform(out => ({ out })))

  const pongContract = oc.input(z.number())
  const contractRouter = oc.router({
    ping: pingContract,
    nested: {
      pong: pongContract,
    },
  })

  const ping = os.contract(pingContract).func(name => `ping ${name}`)
  const pong = os.contract(pongContract).func(num => `pong ${num}`)

  const router = os.contract(contractRouter).router({
    ping,
    nested: os.lazy(() => Promise.resolve({ default: {
      pong: os.lazy(() => Promise.resolve({ default: pong })),
    } })),
  })

  it('build correct types with contract router', () => {
    const client = createRouterClient<typeof contractRouter>({
      baseURL: 'http://localhost:3000/orpc',
    })

    expectTypeOf(client.ping).toMatchTypeOf<Caller<{ in: string }, { out: string }>>()
    expectTypeOf(client.nested.pong).toMatchTypeOf<Caller<number, unknown>>()
  })

  it('build correct types with router', () => {
    const client = createRouterClient<typeof router>({
      baseURL: 'http://localhost:3000/orpc',
    })

    expectTypeOf(client.ping).toMatchTypeOf<Caller<{ in: string }, { out: string }>>()
    expectTypeOf(client.nested.pong).toMatchTypeOf<Caller<number, string>>()
  })
})
