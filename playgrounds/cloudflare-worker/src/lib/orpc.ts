import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { DurableIteratorLinkPlugin } from '@orpc/experimental-durable-iterator/client'
import type { RouterClient } from '@orpc/server'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { router } from '../../worker/router'

const link = new RPCLink({
  url: `${window.location.origin}/rpc`,
  plugins: [
    new DurableIteratorLinkPlugin({
      url: `${window.location.origin}/chat-room`,
      shouldRefreshTokenOnExpire: true,
    }),
  ],
})

export const client: RouterClient<typeof router> = createORPCClient(link)

export const orpc = createTanstackQueryUtils(client)
