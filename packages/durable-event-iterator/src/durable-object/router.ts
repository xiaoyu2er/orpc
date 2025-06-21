import type { JwtAttachment } from '../object'
import type { DurableEventIteratorObjectWebsocketAttachment, DurableEventIteratorObjectWebsocketManager } from './websocket-manager'
import { implement } from '@orpc/server'
import { experimental_HibernationEventIterator as HibernationEventIterator } from '@orpc/server/hibernation'
import { durableEventIteratorContract } from '../client/contract'
import { DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY } from './consts'

const os = implement(durableEventIteratorContract)

export interface DurableEventIteratorObjectRouterContext<
  TEventPayload extends object,
  TJwtAttachment extends JwtAttachment,
  TWsAttachment extends DurableEventIteratorObjectWebsocketAttachment,
> {
  currentWebsocket: WebSocket
  websocketManager: DurableEventIteratorObjectWebsocketManager<TEventPayload, TJwtAttachment, TWsAttachment>
}

const base = os.$context<DurableEventIteratorObjectRouterContext<any, any, any>>()

export const durableEventIteratorRouter = base.router({
  subscribe: base.subscribe.handler(({ context, lastEventId }) => {
    return new HibernationEventIterator<any>((hibernationId) => {
      context.websocketManager.serializeInternalAttachment(context.currentWebsocket, {
        [DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]: hibernationId,
      })

      if (lastEventId !== undefined) {
        context.websocketManager.sendMissingEvents(context.currentWebsocket, hibernationId, lastEventId)
      }
    })
  }),
})
