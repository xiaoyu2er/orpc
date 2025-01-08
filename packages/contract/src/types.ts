import type { ORPCError, ORPCErrorCode } from '@orpc/shared/error'
import type { StandardSchemaV1 } from '@standard-schema/spec'

export type HTTPPath = `/${string}`
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
export type InputStructure = 'compact' | 'detailed'
export type OutputStructure = 'compact' | 'detailed'

export type Schema = StandardSchemaV1 | undefined

export type SchemaInput<
  TSchema extends Schema,
  TFallback = unknown,
> = TSchema extends undefined
  ? TFallback
  : TSchema extends StandardSchemaV1
    ? StandardSchemaV1.InferInput<TSchema>
    : TFallback

export type SchemaOutput<
  TSchema extends Schema,
  TFallback = unknown,
> = TSchema extends undefined
  ? TFallback
  : TSchema extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<TSchema>
    : TFallback

export type ErrorMapItem<TDataSchema extends Schema> = {
  /**
   *
   * @default 200
   */
  status?: number
  message?: string
  description?: string
  data?: TDataSchema
}

export type ErrorMap = undefined | {
  [key in ORPCErrorCode | (string & {})]?: ErrorMapItem<Schema>
}

export type ErrorMapToORPCError<TErrorMap extends ErrorMap> = {
  [K in keyof TErrorMap]: K extends string
    ? TErrorMap[K] extends ErrorMapItem<infer TDataSchema>
      ? ORPCError<K, SchemaOutput<TDataSchema>>
      : never
    : never
}[keyof TErrorMap]

export type ErrorMapToError<TErrorMap extends ErrorMap> = Error | ErrorMapToORPCError<TErrorMap>
