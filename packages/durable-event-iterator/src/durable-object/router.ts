import type {
  DurableEventIteratorObjectWebsocketManager,
} from './websocket-manager'
import { os } from '@orpc/server'
import {
  experimental_HibernationEventIterator as HibernationEventIterator,
} from '@orpc/server/hibernation'
import {
  DURABLE_EVENT_ITERATOR_ID_KEY,
} from '../consts'

const base = os.$context<{
  ws: WebSocket
  ctx: DurableObjectState
  wsManager: DurableEventIteratorObjectWebsocketManager<any, any>
}>()

export const durableEventIteratorObjectRouter = {
  subscribe: base.handler(({ context }) => {
    return new HibernationEventIterator<any>((id) => {
      context.wsManager.serializeInternalAttachment(context.ws, {
        [DURABLE_EVENT_ITERATOR_ID_KEY]: id,
      })
    })
  }),
}
