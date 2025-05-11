import type { router } from '~/router/index'
import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createORPCReactQueryUtils } from '@orpc/react-query'
import { BatchLinkPlugin } from '@orpc/client/plugins'
import { getHeaders } from '@tanstack/react-start/server'
import { createIsomorphicFn } from '@tanstack/react-start'

const link = new RPCLink({
  url: new URL('/api/rpc', typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000'),
  headers: createIsomorphicFn()
    .client(() => ({}))
    .server(() => getHeaders()),
  plugins: [
    new BatchLinkPlugin({
      groups: [{
        condition: () => true,
        context: {},
      }],
    }),
  ],
})

export const client: RouterClient<typeof router> = createORPCClient(link)

export const orpc = createORPCReactQueryUtils(client)
