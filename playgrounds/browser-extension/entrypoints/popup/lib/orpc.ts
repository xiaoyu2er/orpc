import type { router } from '../.../../../background/router'
import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { experimental_RPCLink as RPCLink } from '@orpc/client/message-port'
import { createORPCReactQueryUtils } from '@orpc/react-query'

const port = browser.runtime.connect()

const link = new RPCLink({
  port,
})

export const client: RouterClient<typeof router> = createORPCClient(link)

export const orpc = createORPCReactQueryUtils(client)
