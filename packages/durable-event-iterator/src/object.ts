export const DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL: unique symbol = Symbol('ORPC_DURABLE_EVENT_ITERATOR_OBJECT')

export interface DurableEventIteratorObject<
  TEventPayload extends object,
  TJwtAttachment,
> {
  [DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL]?: {
    eventPayload: TEventPayload
    jwtAttachment: TJwtAttachment
  }
}
