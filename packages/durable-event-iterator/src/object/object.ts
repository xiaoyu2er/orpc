import type {
  experimental_DurableEventIteratorJWTPayload as DurableEventIteratorJWTPayload,
} from '../schemas'
import type {
  experimental_DurableEventIteratorObjectWebsocketManagerAttachment as DurableEventIteratorObjectWebsocketManagerAttachment,
  experimental_DurableEventIteratorObjectWebsocketManagerOptions as DurableEventIteratorObjectWebsocketManagerOptions,
} from './websocket-manager'
import {
  experimental_HibernationPlugin as HibernationPlugin,
} from '@orpc/server/hibernation'
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/websocket'
import { DurableObject } from 'cloudflare:workers'
import { experimental_DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY as DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY } from '../consts'
import {
  experimental_durableEventIteratorObjectRouter as durableEventIteratorObjectRouter,
} from './router'
import {
  experimental_DurableEventIteratorObjectWebsocketManager as DurableEventIteratorObjectWebsocketManager,
} from './websocket-manager'

const handler = new RPCHandler(durableEventIteratorObjectRouter, {
  plugins: [
    new HibernationPlugin(),
  ],
})

export interface experimental_DurableEventIteratorObjectOptions extends DurableEventIteratorObjectWebsocketManagerOptions {

}

export class experimental_DurableEventIteratorObject<
  T extends object,
  TAttachment extends DurableEventIteratorObjectWebsocketManagerAttachment = DurableEventIteratorObjectWebsocketManagerAttachment,
  TEnv = unknown,
> extends DurableObject<TEnv> {
  protected readonly orpcWebsocketManager: DurableEventIteratorObjectWebsocketManager<T, TAttachment>

  constructor(ctx: DurableObjectState, env: TEnv, options: experimental_DurableEventIteratorObjectOptions = {}) {
    super(ctx, env)

    this.orpcWebsocketManager = new DurableEventIteratorObjectWebsocketManager<T, TAttachment>(ctx, options)
  }

  /**
   * Internally used to upgrade the WebSocket connection
   *
   * @warning No verification is done here, you should verify the JWT payload before calling this method.
   */
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const payload = JSON.parse(url.searchParams.get(DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY)!) as DurableEventIteratorJWTPayload

    const { '0': client, '1': server } = new WebSocketPair()

    this.ctx.acceptWebSocket(server)
    this.orpcWebsocketManager.serializeInternalAttachment(server, {
      [DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY]: payload,
    })

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await handler.message(ws, message, {
      context: {
        ws,
        ctx: this.ctx,
        wsManager: this.orpcWebsocketManager,
      },
    })
  }

  override webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void | Promise<void> {
    handler.close(ws)
  }
}
