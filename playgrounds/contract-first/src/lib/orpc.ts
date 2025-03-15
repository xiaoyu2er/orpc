import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createORPCReactQueryUtils } from '@orpc/react-query'
import type { ContractRouterClient } from '@orpc/contract'
import type { contract } from '../contract'

const rpcLink = new RPCLink({
  url: new URL('/rpc', typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000'),
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const orpcClient: ContractRouterClient<typeof contract> = createORPCClient(rpcLink)

export const orpc = createORPCReactQueryUtils(orpcClient)
