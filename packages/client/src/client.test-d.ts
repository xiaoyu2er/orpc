import type { Client, ClientContext } from '@orpc/contract'
import { oc } from '@orpc/contract'
import { implement, os } from '@orpc/server'
import { z } from 'zod'
import { createORPCClient } from './client'

describe('createORPCClient', () => {
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

  const ping = implement(pingContract).handler(name => `ping ${name}`)
  const pong = implement(pongContract).handler(num => `pong ${num}`)

  const router = implement(contractRouter).router({
    ping,
    nested: os.lazy(() => Promise.resolve({ default: {
      pong: os.lazy(() => Promise.resolve({ default: pong })),
    } })),
  })

  it('build correct types with contract router', () => {
    const client = createORPCClient<typeof contractRouter>({} as any)

    expectTypeOf(client.ping).toEqualTypeOf<Client<ClientContext, { in: string }, { out: string }, Error>>()
    expectTypeOf(client.nested.pong).toEqualTypeOf<Client<ClientContext, number, unknown, Error>>()
  })

  it('build correct types with router', () => {
    const client = createORPCClient<typeof router>({} as any)

    expectTypeOf(client.ping).toEqualTypeOf<Client<ClientContext, { in: string }, { out: string }, Error>>()
    expectTypeOf(client.nested.pong).toEqualTypeOf<Client<ClientContext, number, string, Error>>()
  })

  it('pass correct context', () => {
    type Context = { a: number }
    const client = createORPCClient<typeof router, Context>({} as any)

    expectTypeOf(client.ping).toEqualTypeOf<Client<{ a: number }, { in: string }, { out: string }, Error>>()
    expectTypeOf(client.nested.pong).toEqualTypeOf < Client < { a: number }, number, string, Error>>()
  })
})
