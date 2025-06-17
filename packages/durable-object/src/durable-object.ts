import type { StandardRPCJsonSerializerOptions } from '@orpc/client/standard'
import { os } from '@orpc/server'
import {
  experimental_encodeHibernationRPCEvent as encodeHibernationRPCEvent,
  experimental_HibernationEventIterator as HibernationEventIterator,
  experimental_HibernationPlugin as HibernationPlugin,
} from '@orpc/server/hibernation'
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/websocket'
import { DurableObject } from 'cloudflare:workers'

const HIBERNATION_EVENT_ITERATOR_ID_KEY = 'orpc_heii' as const

const base = os.$context<{ ws: WebSocket, ctx: DurableObjectState }>()

const router = {
  subscribe: base.handler(({ context }) => {
    return new HibernationEventIterator((id) => {
      const attachment = context.ws.deserializeAttachment()
      context.ws.serializeAttachment({ ...attachment, [HIBERNATION_EVENT_ITERATOR_ID_KEY]: id })
    })
  }),
}

const handler = new RPCHandler(router, {
  plugins: [
    new HibernationPlugin(),
  ],
})

export interface experimental_ORPCDurableObjectOptions extends StandardRPCJsonSerializerOptions {

}

export interface experimental_ORPCDurableObjectPublishEventOptions {
  /**
   * A filter function to determine which WebSocket connections should receive the event.
   * If not provided, all connected WebSockets will receive the event.
   */
  filter?: (ws: WebSocket) => boolean
}

export type experimental_ORPCDurableObjectWsAttachment = Record<string | number, unknown> & {
  /**
   * Internal Hibernation Event Iterator ID.
   */
  [HIBERNATION_EVENT_ITERATOR_ID_KEY]?: number
}

export type experimental_ORPCDurableObjectAllowedWsAttachment = experimental_ORPCDurableObjectWsAttachment & {
  /**
   * Internal Hibernation Event Iterator ID.
   */
  [HIBERNATION_EVENT_ITERATOR_ID_KEY]?: never
}

export class experimental_ORPCDurableObject<
  T,
  TAttachment extends experimental_ORPCDurableObjectWsAttachment = experimental_ORPCDurableObjectWsAttachment,
  TEnv = unknown,
> extends DurableObject<TEnv> {
  protected readonly orpc_options: experimental_ORPCDurableObjectOptions

  constructor(ctx: DurableObjectState, env: TEnv, options: experimental_ORPCDurableObjectOptions = {}) {
    super(ctx, env)
    this.orpc_options = options
  }

  publishEvent(payload: T, options: experimental_ORPCDurableObjectPublishEventOptions = {}): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (options.filter && !options.filter(ws)) {
        continue
      }

      const attachment = this.deserializeWsAttachment(ws)
      const hibernationEventIteratorId = attachment?.[HIBERNATION_EVENT_ITERATOR_ID_KEY]

      if (hibernationEventIteratorId === undefined) {
        // Maybe the connection not finished the subscription process yet
        continue
      }

      ws.send(encodeHibernationRPCEvent(hibernationEventIteratorId, payload, this.orpc_options))
    }
  }

  protected deserializeWsAttachment(ws: WebSocket): (TAttachment & experimental_ORPCDurableObjectWsAttachment) | null {
    return ws.deserializeAttachment()
  }

  protected serializeWsAttachment(ws: WebSocket, attachment: TAttachment): void {
    const old = this.deserializeWsAttachment(ws)

    ws.serializeAttachment({
      ...attachment,
      [HIBERNATION_EVENT_ITERATOR_ID_KEY]: old?.[HIBERNATION_EVENT_ITERATOR_ID_KEY],
    })
  }

  override fetch(request: Request): Response | Promise<Response> {
    if (request.headers.get('upgrade') === 'websocket') {
      const { '0': client, '1': server } = new WebSocketPair()

      this.ctx.acceptWebSocket(server)

      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    }

    return new Response('Not Found', { status: 404 })
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await handler.message(ws, message, {
      context: {
        ws,
        ctx: this.ctx,
      },
    })
  }

  override webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void | Promise<void> {
    handler.close(ws)
  }
}
