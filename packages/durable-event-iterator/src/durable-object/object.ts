import type { DurableEventIteratorObject as BaseDurableEventIteratorObject, JwtAttachment } from '../object'
import type { DurableEventIteratorJwtPayload } from '../schemas'
import type { DurableEventIteratorObjectRecoveryOptions } from './recovery'
import type { DurableEventIteratorObjectWebsocketAttachment, DurableEventIteratorObjectWebsocketOptions } from './websocket'
import { DurableObject } from 'cloudflare:workers'
import { DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL } from '../object'
import { DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY } from './consts'
import { durableEventIteratorHandler } from './handler'
import { DurableEventIteratorObjectRecovery } from './recovery'
import { DurableEventIteratorObjectWebsocket } from './websocket'

export interface DurableEventIteratorObjectOptions<TEventPayload extends object>
  extends Omit<DurableEventIteratorObjectWebsocketOptions<TEventPayload>, 'recovery'>,
  DurableEventIteratorObjectRecoveryOptions {

}

export class DurableEventIteratorObject<
  TEventPayload extends object,
  TJwtAttachment extends JwtAttachment = JwtAttachment,
  TWsAttachment extends DurableEventIteratorObjectWebsocketAttachment = DurableEventIteratorObjectWebsocketAttachment,
  TEnv = unknown,
> extends DurableObject<TEnv> implements BaseDurableEventIteratorObject<TEventPayload, TJwtAttachment> {
  [DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL]?: {
    eventPayload: TEventPayload
    jwtAttachment: TJwtAttachment
  }

  protected readonly dei: {
    recovery: DurableEventIteratorObjectRecovery<TEventPayload>
    ws: DurableEventIteratorObjectWebsocket<TEventPayload, TJwtAttachment, TWsAttachment>
  }

  constructor(ctx: DurableObjectState, env: TEnv, options: DurableEventIteratorObjectOptions<TEventPayload> = {}) {
    super(ctx, env)

    const recovery = new DurableEventIteratorObjectRecovery<TEventPayload>(ctx, options)

    this.dei = {
      recovery,
      ws: new DurableEventIteratorObjectWebsocket(ctx, {
        ...options,
        recovery,
      }),
    }
  }

  /**
   * Internally used to upgrade the WebSocket connection
   *
   * @warning No verification is done here, you should verify the JWT payload before calling this method.
   */
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const payload = JSON.parse(url.searchParams.get(DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY)!) as DurableEventIteratorJwtPayload

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
