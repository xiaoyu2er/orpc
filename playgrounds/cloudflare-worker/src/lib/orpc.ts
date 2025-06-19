import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import {
  experimental_DurableEventIteratorLinkPlugin as DurableEventIteratorLinkPlugin,
} from '@orpc/durable-event-iterator/client'
import type { RouterClient } from '@orpc/server'
import type { router } from '../../worker'

const link = new RPCLink({
  url: `${window.location.origin}`,
  plugins: [
    new DurableEventIteratorLinkPlugin({
      url: `${window.location.origin}/chat-room`,
    }),
  ],
})

export const client: RouterClient<typeof router> = createORPCClient(link)
