import type { EventMessage } from './types'
import { assertEventId, assertEventRetry } from './encoder'

const EVENT_SOURCE_META_SYMBOL = Symbol('ORPC_EVENT_SOURCE_META')

export type EventMeta = Partial<Pick<EventMessage, 'retry' | 'id'>>

export function isEventMetaContainer(value: unknown): value is Record<PropertyKey, unknown> {
  return !!value && (typeof value === 'object' || typeof value === 'function')
}

export function withEventMeta<T extends object>(container: T, meta: EventMeta): T {
  if (meta.id !== undefined) {
    assertEventId(meta.id)
  }

  if (meta.retry !== undefined) {
    assertEventRetry(meta.retry)
  }

  return new Proxy(container, {
    get(target, prop, receiver) {
      if (prop === EVENT_SOURCE_META_SYMBOL) {
        return meta
      }

      return Reflect.get(target, prop, receiver)
    },
  })
}

export function getEventMeta(container: unknown): EventMeta | undefined {
  return isEventMetaContainer(container)
    ? Reflect.get(container, EVENT_SOURCE_META_SYMBOL) as EventMeta | undefined
    : undefined
}
