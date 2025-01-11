import type { router } from '@/router'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createORPCReactQueryUtils } from '@orpc/react-query'

const rpcLink = new RPCLink({
  url: 'http://localhost:3000/rpc',
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const orpcClient = createORPCClient<typeof router>(rpcLink)

export const orpc = createORPCReactQueryUtils(orpcClient)
