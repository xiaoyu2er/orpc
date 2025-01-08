import type { ErrorMap, ErrorMapItem, SchemaOutput } from '@orpc/contract'
import type { ORPCError } from '@orpc/shared/error'

export type ORPCErrorFromErrorMap<TErrorMap extends ErrorMap> = {
  [K in keyof TErrorMap]: K extends string
    ? TErrorMap[K] extends ErrorMapItem<infer TDataSchema>
      ? ORPCError<K, SchemaOutput<TDataSchema>>
      : never
    : never
}[keyof TErrorMap]
