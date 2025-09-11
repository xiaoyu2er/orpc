import type { Client } from '@orpc/client'
import type { EncodeHibernationRPCEventOptions } from '@orpc/server/hibernation'
import type { DurableObject } from 'cloudflare:workers'
import type { EventResumeStorage } from './resume-storage'
import type { DurableEventIteratorWebsocket } from './websocket'
import { implement, ORPCError } from '@orpc/server'
import { encodeHibernationRPCEvent, HibernationEventIterator } from '@orpc/server/hibernation'
import { get } from '@orpc/shared'
import { durableEventIteratorContract } from '../client/contract'

const os = implement(durableEventIteratorContract)

export interface DurableEventIteratorObjectRouterContext {
  object: DurableObject<any>
  resumeStorage: EventResumeStorage<any>
  websocket: DurableEventIteratorWebsocket
  options: EncodeHibernationRPCEventOptions
}

const base = os.$context<DurableEventIteratorObjectRouterContext>()

export const durableEventIteratorRouter = base.router({
  subscribe: base.subscribe.handler(({ context, lastEventId }) => {
    return new HibernationEventIterator<any>((hibernationId) => {
      context.websocket['~orpc'].serializeHibernationId(hibernationId)

      if (typeof lastEventId !== 'string') {
        return
      }

      const resumePayloads = context.resumeStorage.get(context.websocket, lastEventId)
      for (const payload of resumePayloads) {
        context.websocket.send(
          encodeHibernationRPCEvent(hibernationId, payload, context.options),
        )
      }
    })
  }),

  call: base.call.handler(({ context, input, signal, lastEventId }) => {
    const allowMethods = context.websocket['~orpc'].deserializeTokenPayload().rpc
    const [method, ...path] = input.path

    if (!allowMethods?.includes(method)) {
      throw new ORPCError('FORBIDDEN', {
        message: `Method "${method}" is not allowed.`,
      })
    }

    const nestedClient = (context.object as any)[method](context.websocket)

    const client = get(nestedClient, path) as Client<any, any, any, any>

    return client(input.input, { signal, lastEventId })
  }),
})
