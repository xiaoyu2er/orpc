import type { NestedClient } from './client'
import type { ContractRouterClient } from './router-client'
import { z } from 'zod'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'

const schema = z.object({
  value: z.string().transform(() => 1),
})

const baseError = {
  BASE: {
    data: z.string(),
  },
}

const ping = new ContractProcedure({ InputSchema: schema, OutputSchema: undefined, route: { path: '/procedure' }, errorMap: baseError })
const pinged = DecoratedContractProcedure.decorate(ping)

const pong = new ContractProcedure({ InputSchema: undefined, OutputSchema: schema, errorMap: {} })
const ponged = DecoratedContractProcedure.decorate(pong)

const router = {
  ping,
  pinged,
  pong,
  ponged,
  nested: {
    ping,
    pinged,
    pong,
    ponged,
  },
}

describe('ContractRouterClient', () => {
  it('compatible with NestedClient', () => {
    expectTypeOf<ContractRouterClient<typeof router, unknown>>().toMatchTypeOf<NestedClient<unknown>>()
    expectTypeOf<ContractRouterClient<typeof router, 'invalid'>>().not.toMatchTypeOf<NestedClient<unknown>>()
  })
})
