import type { FindGlobalInstanceType, IsNever } from '@orpc/shared'
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

export type AbortSignal = FindGlobalInstanceType<'AbortSignal'>

/**
 * Utility type to prevent `never` from propagating through a type chain.
 *
 * This utility is particularly useful in scenarios where a conflict in type resolution
 * could result in `never`, which would terminate type inference prematurely.
 *
 * @example
 * ```ts
 * errors<const U extends ErrorMap & Partial<TErrorMap>>(errors: U): PreventNever<U & TErrorMap> & ContractBuilder<U & TErrorMap> {
 * // ...
 * }
 * ```
 *
 * The TypeScript compiler option `exactOptionalPropertyTypes` is rarely enabled.
 * Consequently, using `Partial<TErrorMap>` still allows users to pass `undefined`.
 * This can lead to conflicts between `U` and `TErrorMap`, potentially resolving to `never`.
 * To prevent `never` from halting the type chain, `PreventNever` is used.
 *
 */
export type PreventNever<T> = IsNever<T> extends true ? never : unknown
