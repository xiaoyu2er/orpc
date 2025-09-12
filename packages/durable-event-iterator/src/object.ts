import type { NestedClient } from '@orpc/client'
import type { AsyncIteratorClass, JsonValue } from '@orpc/shared'

export type TokenAtt = JsonValue | undefined

export interface DurableEventIteratorObjectDef<
  TEventPayload extends object,
> {
  eventPayload?: { type: TEventPayload }
}

export interface DurableEventIteratorObject<
  TEventPayload extends object,
> {
  '~orpc'?: DurableEventIteratorObjectDef<TEventPayload>
}

export type InferDurableEventIteratorObjectRPC<
  T extends DurableEventIteratorObject<any>,
> = Exclude<{
  [K in keyof T]: T[K] extends ((...args: any[]) => NestedClient<object>)
    ? K
    : never
}[keyof T], keyof AsyncIteratorClass<any>> & string
