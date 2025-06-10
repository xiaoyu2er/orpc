import { experimental_RPCHandler as RPCHandler } from '@orpc/server/websocket'
import {
  experimental_encodeHibernationRPCEvent as encodeHibernationRPCEvent,
  experimental_HibernationEventIterator as HibernationEventIterator,
  experimental_HibernationPlugin as HibernationPlugin,
} from '@orpc/server/hibernation'
import { onError, os } from '@orpc/server'
import { DurableObject } from 'cloudflare:workers'
import { z } from 'zod'

const base = os.$context<{
  handler: RPCHandler<any>
  ws: WebSocket
  getWebsockets: () => WebSocket[]
}>()

export const router = {
  send: base.input(z.object({ message: z.string() })).handler(async ({ input, context }) => {
    const websockets = context.getWebsockets()

    for (const ws of websockets) {
      const data = ws.deserializeAttachment()
      if (typeof data !== 'object' || data === null) {
        continue
      }

      const { id } = data

      ws.send(encodeHibernationRPCEvent(id, input.message))
    }
  }),
  onMessage: base.handler(async ({ context }) => {
    return new HibernationEventIterator<string>((id) => {
      context.ws.serializeAttachment({ id })
    })
  }),
}

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
  plugins: [
    new HibernationPlugin(),
  ],
})

export class ChatRoom extends DurableObject {
  async fetch(): Promise<Response> {
    const { '0': client, '1': server } = new WebSocketPair()

    this.ctx.acceptWebSocket(server)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await handler.message(ws, message, {
      context: {
        handler,
        ws,
        getWebsockets: () => this.ctx.getWebSockets(),
      },
    })
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    handler.close(ws)
  }
}
