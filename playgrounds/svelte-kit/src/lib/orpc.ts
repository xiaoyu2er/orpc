import type { RouterClient } from '@orpc/server'
import type { router } from '../router'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createORPCSvelteQueryUtils } from '@orpc/svelte-query'

const rpcLink = new RPCLink({
  url: new URL('/rpc', typeof window !== 'undefined' ? window.location.href : 'http://localhost:5173'),
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const client: RouterClient<typeof router> = createORPCClient(rpcLink)

export const orpc = createORPCSvelteQueryUtils(client)
