import type { StandardRPCJsonSerializerOptions } from '@orpc/client/standard'
import type {
  experimental_DurableEventIteratorJWTPayload as DurableEventIteratorJWTPayload,
} from '../schemas'
import {
  experimental_encodeHibernationRPCEvent as encodeHibernationRPCEvent,
} from '@orpc/server/hibernation'
import {
  experimental_DURABLE_EVENT_ITERATOR_ID_KEY as DURABLE_EVENT_ITERATOR_ID_KEY,
  experimental_DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY as DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY,
} from '../consts'

export interface experimental_DurableEventIteratorObjectWebsocketManagerOptions extends StandardRPCJsonSerializerOptions {

}

export interface experimental_DurableEventIteratorObjectWebsocketManagerPublishEventOptions {
  /**
   * A filter function to determine which WebSocket connections should receive the event.
   * If not provided, all connected WebSockets will receive the event.
   */
  filter?: (ws: WebSocket) => boolean
}

export type experimental_DurableEventIteratorObjectWebsocketManagerInternalAttachment = {
  /**
   * Internal Hibernation Event Iterator ID.
   */
  [DURABLE_EVENT_ITERATOR_ID_KEY]?: number

  /**
   * The payload of the JWT used to authenticate the WebSocket connection.
   */
  [DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY]: DurableEventIteratorJWTPayload
}

export type experimental_DurableEventIteratorObjectWebsocketManagerAttachment
  = Record<string | number, unknown>
    & Record<keyof experimental_DurableEventIteratorObjectWebsocketManagerInternalAttachment, never>

export class experimental_DurableEventIteratorObjectWebsocketManager<
  T extends object,
  TAttachment extends experimental_DurableEventIteratorObjectWebsocketManagerAttachment,
> {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly options: experimental_DurableEventIteratorObjectWebsocketManagerOptions,
  ) {}

  publishEvent(payload: T, options: experimental_DurableEventIteratorObjectWebsocketManagerPublishEventOptions = {}): void {
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

  serializeAttachment(ws: WebSocket, attachment: TAttachment): void {
    const old = this.deserializeAttachment(ws)

    ws.serializeAttachment({
      ...attachment,
      [DURABLE_EVENT_ITERATOR_ID_KEY]: old[DURABLE_EVENT_ITERATOR_ID_KEY],
      [DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY]: old[DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY],
    })
  }

  serializeInternalAttachment(ws: WebSocket, attachment: Partial<experimental_DurableEventIteratorObjectWebsocketManagerInternalAttachment>): void {
    const old = this.deserializeAttachment(ws)

    ws.serializeAttachment({
      ...old,
      [DURABLE_EVENT_ITERATOR_ID_KEY]: attachment[DURABLE_EVENT_ITERATOR_ID_KEY] ?? old?.[DURABLE_EVENT_ITERATOR_ID_KEY],
      [DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY]: attachment[DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY] ?? old?.[DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY],
    })
  }

  deserializeAttachment(ws: WebSocket): TAttachment & experimental_DurableEventIteratorObjectWebsocketManagerInternalAttachment {
    return ws.deserializeAttachment()
  }
}
