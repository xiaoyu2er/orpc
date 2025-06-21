import type { StandardRPCJsonSerializerOptions } from '@orpc/client/standard'
import type { DurableEventIteratorJwtPayload } from '../schemas'
import { experimental_encodeHibernationRPCEvent as encodeHibernationRPCEvent } from '@orpc/server/hibernation'
import { DURABLE_EVENT_ITERATOR_ID_KEY, DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY } from './consts'

export interface DurableEventIteratorObjectWebsocketOptions extends StandardRPCJsonSerializerOptions {

}

export interface DurableEventIteratorObjectWebsocketPublishEventOptions {
  /**
   * A filter function to determine which WebSocket connections should receive the event.
   * If not provided, all connected WebSockets will receive the event.
   */
  filter?: (ws: WebSocket) => boolean
}

export type DurableEventIteratorObjectWebsocketInternalAttachment<
  TJwtAttachment,
> = {
  /**
   * Internal Hibernation Event Iterator ID.
   */
  [DURABLE_EVENT_ITERATOR_ID_KEY]?: number

  /**
   * The payload of the JWT used to authenticate the WebSocket connection.
   */
  [DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY]: DurableEventIteratorJwtPayload & {
    att: TJwtAttachment
  }
}

export type DurableEventIteratorObjectWebsocketAttachment
  = Record<string | number, unknown>
    & Record<keyof DurableEventIteratorObjectWebsocketInternalAttachment<any>, never>

export class DurableEventIteratorObjectWebsocket<
  TEventPayload extends object,
  TJwtAttachment,
  TWsAttachment extends DurableEventIteratorObjectWebsocketAttachment,
> {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly options: DurableEventIteratorObjectWebsocketOptions,
  ) {}

  publishEvent(payload: TEventPayload, options: DurableEventIteratorObjectWebsocketPublishEventOptions = {}): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (options.filter && !options.filter(ws)) {
        continue
      }

      const attachment = this.deserializeAttachment(ws)
      const hibernationEventIteratorId = attachment?.[DURABLE_EVENT_ITERATOR_ID_KEY]

      if (hibernationEventIteratorId === undefined) {
        // Maybe the connection not finished the subscription process yet
        continue
      }

      ws.send(encodeHibernationRPCEvent(hibernationEventIteratorId, payload, this.options))
    }
  }

  serializeAttachment(ws: WebSocket, attachment: TWsAttachment): void {
    const old = this.deserializeAttachment(ws)

    ws.serializeAttachment({
      ...attachment,
      [DURABLE_EVENT_ITERATOR_ID_KEY]: old[DURABLE_EVENT_ITERATOR_ID_KEY],
      [DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY]: old[DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY],
    })
  }

  serializeInternalAttachment(ws: WebSocket, attachment: Partial<DurableEventIteratorObjectWebsocketInternalAttachment<TJwtAttachment>>): void {
    const old = this.deserializeAttachment(ws)

    ws.serializeAttachment({
      ...old,
      [DURABLE_EVENT_ITERATOR_ID_KEY]: attachment[DURABLE_EVENT_ITERATOR_ID_KEY] ?? old?.[DURABLE_EVENT_ITERATOR_ID_KEY],
      [DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY]: attachment[DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY] ?? old?.[DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY],
    })
  }

  deserializeAttachment(ws: WebSocket): TWsAttachment & DurableEventIteratorObjectWebsocketInternalAttachment<TJwtAttachment> {
    return ws.deserializeAttachment()
  }
}
