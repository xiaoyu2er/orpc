import type { DurableEventIteratorObject as BaseDurableEventIteratorObject } from '../object'
import type { DurableEventIteratorJWTPayload } from '../schemas'
import type { DurableEventIteratorObjectWebsocketAttachment, DurableEventIteratorObjectWebsocketOptions } from './websocket'
import { DurableObject } from 'cloudflare:workers'
import { DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL } from '../object'
import { DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY } from './consts'
import { durableEventIteratorHandler } from './handler'
import { DurableEventIteratorObjectWebsocket } from './websocket'

export interface DurableEventIteratorObjectOptions extends DurableEventIteratorObjectWebsocketOptions {

}

export class DurableEventIteratorObject<
  TEventPayload extends object,
  TJwtAttachment = unknown,
  TWsAttachment extends DurableEventIteratorObjectWebsocketAttachment = DurableEventIteratorObjectWebsocketAttachment,
  TEnv = unknown,
> extends DurableObject<TEnv> implements BaseDurableEventIteratorObject<TEventPayload, TJwtAttachment> {
  [DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL]?: {
    eventPayload: TEventPayload
    jwtAttachment: TJwtAttachment
  }

  protected readonly dei: {
    ws: DurableEventIteratorObjectWebsocket<TEventPayload, TJwtAttachment, TWsAttachment>
  }

  constructor(ctx: DurableObjectState, env: TEnv, options: DurableEventIteratorObjectOptions = {}) {
    super(ctx, env)

    this.dei = {
      ws: new DurableEventIteratorObjectWebsocket(ctx, options),
    }
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
    this.dei.ws.serializeInternalAttachment(server, {
      [DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY]: payload,
    })

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await durableEventIteratorHandler.message(ws, message, {
      context: {
        ws,
        ctx: this.ctx,
        dei: this.dei,
      },
    })
  }

  override webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void | Promise<void> {
    durableEventIteratorHandler.close(ws)
  }
}
