import type { router } from '~/server/router'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createORPCVueQueryUtils } from '@orpc/vue-query'

const rPCLink = new RPCLink({
  url: 'http://localhost:3000/rpc',
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const client = createORPCClient<typeof router>(rPCLink)

export const orpc = createORPCVueQueryUtils(client)
