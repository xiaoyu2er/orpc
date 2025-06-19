import type { StandardRPCJsonSerializerOptions } from '@orpc/client/standard'
import type {
  experimental_DurableEventIteratorJWTPayload as DurableEventIteratorJWTPayload,
} from './schemas'
import { os } from '@orpc/server'
import {
  experimental_encodeHibernationRPCEvent as encodeHibernationRPCEvent,
  experimental_HibernationEventIterator as HibernationEventIterator,
  experimental_HibernationPlugin as HibernationPlugin,
} from '@orpc/server/hibernation'
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/websocket'
import { DurableObject } from 'cloudflare:workers'

const HIBERNATION_EVENT_ITERATOR_ID_KEY = 'orpc_heii' as const
const JWT_PAYLOAD_KEY = 'orpc_jwtp' as const

const base = os.$context<{ ws: WebSocket, ctx: DurableObjectState }>()

export const durableEventIteratorObjectRouter = {
  subscribe: base.handler(({ context }) => {
    return new HibernationEventIterator<any>((id) => {
      const attachment = context.ws.deserializeAttachment()
      context.ws.serializeAttachment({ ...attachment, [HIBERNATION_EVENT_ITERATOR_ID_KEY]: id })
    })
  }),
}

const handler = new RPCHandler(durableEventIteratorObjectRouter, {
  plugins: [
    new HibernationPlugin(),
  ],
})

export interface experimental_DurableEventIteratorObjectOptions extends StandardRPCJsonSerializerOptions {

}

export interface experimental_DurableEventIteratorObjectPublishEventOptions {
  /**
   * A filter function to determine which WebSocket connections should receive the event.
   * If not provided, all connected WebSockets will receive the event.
   */
  filter?: (ws: WebSocket) => boolean
}

export type experimental_DurableEventIteratorObjectInternalWsAttachment = {
  /**
   * Internal Hibernation Event Iterator ID.
   */
  [HIBERNATION_EVENT_ITERATOR_ID_KEY]?: number

  /**
   * The payload of the JWT used to authenticate the WebSocket connection.
   */
  [JWT_PAYLOAD_KEY]: DurableEventIteratorJWTPayload
}

export type experimental_DurableEventIteratorObjectWsAttachment
  = Record<string | number, unknown>
    & Record<keyof experimental_DurableEventIteratorObjectInternalWsAttachment, never>

export class experimental_DurableEventIteratorObject<
  T,
  TAttachment extends experimental_DurableEventIteratorObjectWsAttachment = experimental_DurableEventIteratorObjectWsAttachment,
  TEnv = unknown,
> extends DurableObject<TEnv> {
  protected readonly orpc_options: experimental_DurableEventIteratorObjectOptions

  constructor(ctx: DurableObjectState, env: TEnv, options: experimental_DurableEventIteratorObjectOptions = {}) {
    super(ctx, env)
    this.orpc_options = options
  }

  publishEvent(payload: T, options: experimental_DurableEventIteratorObjectPublishEventOptions = {}): void {
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

  protected deserializeWsAttachment(ws: WebSocket): TAttachment & experimental_DurableEventIteratorObjectInternalWsAttachment {
    return ws.deserializeAttachment()
  }

  protected serializeWsAttachment(ws: WebSocket, attachment: TAttachment): void {
    const old = this.deserializeWsAttachment(ws)

    ws.serializeAttachment({
      ...attachment,
      [HIBERNATION_EVENT_ITERATOR_ID_KEY]: old[HIBERNATION_EVENT_ITERATOR_ID_KEY],
      [JWT_PAYLOAD_KEY]: old[JWT_PAYLOAD_KEY],
    })
  }

  /**
   * Internally used to upgrade the WebSocket connection
   *
   * @warning No verification is done here, you should verify the JWT payload before calling this method.
   */
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const jwtPayload = JSON.parse(url.searchParams.get('jwtPayload')!) as DurableEventIteratorJWTPayload

    const { '0': client, '1': server } = new WebSocketPair()

    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ jwtPayload })

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
      },
    })
  }

  override webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void | Promise<void> {
    handler.close(ws)
  }
}
