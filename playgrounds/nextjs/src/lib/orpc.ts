import type { router } from '@/router'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createORPCReactQueryUtils } from '@orpc/react-query'

const rPCLink = new RPCLink({
  url: 'http://localhost:3000/rpc',
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const orpcClient = createORPCClient<typeof router>(rPCLink)

export const orpc = createORPCReactQueryUtils(orpcClient)
