import { os } from '@orpc/server'
import {
  experimental_HibernationEventIterator as HibernationEventIterator,
} from '@orpc/server/hibernation'
import {
  experimental_DURABLE_EVENT_ITERATOR_ID_KEY as DURABLE_EVENT_ITERATOR_ID_KEY,
} from '../consts'

const base = os.$context<{ ws: WebSocket, ctx: DurableObjectState }>()

export const experimental_durableEventIteratorObjectRouter = {
  subscribe: base.handler(({ context }) => {
    return new HibernationEventIterator<any>((id) => {
      const attachment = context.ws.deserializeAttachment()
      context.ws.serializeAttachment({ ...attachment, [DURABLE_EVENT_ITERATOR_ID_KEY]: id })
    })
  }),
}
