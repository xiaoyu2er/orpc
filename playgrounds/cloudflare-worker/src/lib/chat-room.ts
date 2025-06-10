import { experimental_RPCLink as RPCLink } from '@orpc/client/websocket'
import { createORPCClient } from '@orpc/client'
import type { router } from '../../worker/dos/chat-room'
import type { RouterClient } from '@orpc/server'

const websocket = new WebSocket(`ws://${window.location.host}/chat-room`)

websocket.addEventListener('error', (event) => {
  console.error(event)
})

const link = new RPCLink({
  websocket,
})

export const chatRoomClient: RouterClient<typeof router> = createORPCClient(link)
