import type { ProcedureClient } from '@orpc/server'
import { oc } from '@orpc/contract'
import { os } from '@orpc/server'
import { z } from 'zod'
import { createClient } from './client'

describe('createClient', () => {
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
    const client = createClient<typeof contractRouter>({} as any)

    expectTypeOf(client.ping).toMatchTypeOf<ProcedureClient<{ in: string }, { out: string }, unknown>>()
    expectTypeOf(client.nested.pong).toMatchTypeOf<ProcedureClient<number, unknown, unknown>>()
  })

  it('build correct types with router', () => {
    const client = createClient<typeof router>({} as any)

    expectTypeOf(client.ping).toMatchTypeOf<ProcedureClient<{ in: string }, { out: string }, unknown>>()
    expectTypeOf(client.nested.pong).toMatchTypeOf<ProcedureClient<number, string, unknown>>()
  })

  it('pass correct context', () => {
    type Context = { a: number }
    const client = createClient<typeof router, Context>({} as any)

    expectTypeOf(client.ping).toEqualTypeOf<ProcedureClient<{ in: string }, { out: string }, { a: number }>>()
    expectTypeOf(client.nested.pong).toEqualTypeOf<ProcedureClient<number, string, { a: number }>>()
  })
})
