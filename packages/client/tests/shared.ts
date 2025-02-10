import { RPCHandler } from '@orpc/server/fetch'
import { router } from '../../server/tests/shared'
import { createORPCClient } from '../src'
import { RPCLink } from '../src/adapters/fetch'

const rpcHandler = new RPCHandler(router)

export type ClientContext = { cache?: string }

const rpcLink = new RPCLink<ClientContext>({
  url: 'http://localhost:3000',
  fetch: async (url, init, context) => {
    if (context?.cache) {
      throw new Error(`cache=${context.cache} is not supported`)
    }

    const request = new Request(url, init)

    const { matched, response } = await rpcHandler.handle(request, {
      context: { db: 'postgres' },
    })

    if (!matched) {
      throw new Error('No procedure matched')
    }

    return response
  },
})

export const orpc = createORPCClient<typeof router, ClientContext>(rpcLink)
