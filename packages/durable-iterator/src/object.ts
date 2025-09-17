import type { NestedClient } from '@orpc/client'
import type { AsyncIteratorClass, JsonValue } from '@orpc/shared'

export type TokenAtt = JsonValue | undefined

export interface DurableIteratorObjectDef<
  TEventPayload extends object,
> {
  '~eventPayloadType'?: { type: TEventPayload }
}

export interface DurableIteratorObject<
  TEventPayload extends object,
> {
  '~orpc'?: DurableIteratorObjectDef<TEventPayload>
}

export type InferDurableIteratorObjectRPC<
  T extends DurableIteratorObject<any>,
> = Exclude<{
  [K in keyof T]: T[K] extends ((...args: any[]) => NestedClient<object>)
    ? K
    : never
}[keyof T], keyof AsyncIteratorClass<any>> & string
