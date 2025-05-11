import type { router } from '~/router/index'
import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createORPCReactQueryUtils } from '@orpc/react-query'
import { BatchLinkPlugin } from '@orpc/client/plugins'

const rpcLink = new RPCLink({
  url: new URL('/rpc', typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000'),
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

export const orpcClient: RouterClient<typeof router> = createORPCClient(rpcLink)

export const orpc = createORPCReactQueryUtils(orpcClient)
