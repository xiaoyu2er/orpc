import type { router } from '@/router'
import { createORPCClient } from '@orpc/client'
import { ORPCLink } from '@orpc/client/fetch'
import { createORPCReactQueryUtils } from '@orpc/react-query'

const orpcLink = new ORPCLink({
  url: 'http://localhost:3000/rpc',
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const orpcClient = createORPCClient<typeof router>(orpcLink)

export const orpc = createORPCReactQueryUtils(orpcClient)
