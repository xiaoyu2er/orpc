import type { DurableEventIteratorObjectWebsocket } from './websocket'
import { implement } from '@orpc/server'
import { experimental_HibernationEventIterator as HibernationEventIterator } from '@orpc/server/hibernation'
import { experimental_HibernationPlugin as HibernationPlugin } from '@orpc/server/hibernation'
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/websocket'
import { durableEventIteratorContract } from '../client/contract'
import { DURABLE_EVENT_ITERATOR_ID_KEY } from './consts'

const os = implement(durableEventIteratorContract)

const base = os.$context<{
  ws: WebSocket
  ctx: DurableObjectState
  dei: {
    ws: DurableEventIteratorObjectWebsocket<any, any, any>
  }
}>()

const durableEventIteratorRouter = base.router({
  subscribe: base.subscribe.handler(({ context }) => {
    return new HibernationEventIterator<any>((id) => {
      context.dei.ws.serializeInternalAttachment(context.ws, {
        [DURABLE_EVENT_ITERATOR_ID_KEY]: id,
      })
    })
  }),
})

export const durableEventIteratorHandler = new RPCHandler(durableEventIteratorRouter, {
  plugins: [
    new HibernationPlugin(),
  ],
})
