import type { CommonORPCErrorCode } from './error-orpc'
import type { Schema } from './types'

export type ErrorMapItem<TDataSchema extends Schema> = {
  /**
   *
   * @default 500
   */
  status?: number
  message?: string
  description?: string
  data?: TDataSchema
}

export interface ErrorMap {
  [k: string]: ErrorMapItem<Schema>
}

/**
 * const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions
 *
 * Purpose:
 * - Helps `U` suggest `CommonORPCErrorCode` to the user when typing.
 *
 * Why not replace `ErrorMap` with `ErrorMapSuggestions`?
 * - `ErrorMapSuggestions` has a drawback: it allows `undefined` values for items.
 * - `ErrorMapGuard<TErrorMap>` uses `Partial`, which can introduce `undefined` values.
 *
 * This could lead to unintended behavior where `undefined` values override `TErrorMap`,
 * potentially resulting in a `never` type after merging.
 *
 * Recommendation:
 * - Use `ErrorMapSuggestions` to assist users in typing correctly but do not replace `ErrorMap`.
 * - Ensure `ErrorMapGuard<TErrorMap>` is adjusted to prevent `undefined` values.
 */
export type ErrorMapSuggestions = {
  [key in CommonORPCErrorCode | (string & {})]?: ErrorMapItem<Schema>
}

/**
 * `U` extends `ErrorMap` & `ErrorMapGuard<TErrorMap>`
 *
 * `ErrorMapGuard` is a utility type that ensures `U` cannot redefine the structure of `TErrorMap`.
 * It achieves this by setting each key in `TErrorMap` to `never`, effectively preventing any redefinition.
 *
 * Why not just use `Partial<TErrorMap>`?
 * - Allowing users to redefine existing error map items would require using `StrictErrorMap`.
 * - However, I prefer not to use `StrictErrorMap` frequently, due to perceived performance concerns,
 *   though this has not been benchmarked and is based on personal preference.
 *
 */
export type ErrorMapGuard<TErrorMap extends ErrorMap> = {
  [K in keyof TErrorMap]?: never
}

/**
 * Since `undefined` has a specific meaning (it use default value),
 * we ensure all additional properties in each item of the ErrorMap are explicitly set to `undefined`.
 */
export type StrictErrorMap<T extends ErrorMap> = {
  [K in keyof T]: T[K] & Partial<Record<Exclude<keyof ErrorMapItem<any>, keyof T[K]>, undefined>>
}
