import type { router } from '@/router'
import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createORPCReactQueryUtils } from '@orpc/react-query'
import { BatchLinkPlugin } from '@orpc/client/plugins'

declare global {
  var $client: RouterClient<typeof router>
}

const rpcLink = new RPCLink({
  url: () => {
    if (typeof window === 'undefined') {
      throw new Error('Cannot create RPC link in server-side')
    }

    return new URL('/rpc', window.location.href)
  },
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
  plugins: [
    new BatchLinkPlugin({
      groups: [{
        condition: () => true,
        context: {},
      }],
    }),
  ],
})

export const orpcClient: RouterClient<typeof router> = globalThis.$client ?? createORPCClient(rpcLink)

export const orpc = createORPCReactQueryUtils(orpcClient)
