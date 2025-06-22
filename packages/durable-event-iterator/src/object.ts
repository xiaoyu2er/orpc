import type { JsonValue } from '@orpc/shared'

export const DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL: unique symbol = Symbol('ORPC_DURABLE_EVENT_ITERATOR_OBJECT')

export type TokenAttachment = JsonValue | undefined

export interface DurableEventIteratorObject<
  TEventPayload extends object,
  TTokenAttachment extends TokenAttachment,
> {
  [DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL]?: {
    eventPayload: TEventPayload
    tokenAttachment: TTokenAttachment
  }
}
