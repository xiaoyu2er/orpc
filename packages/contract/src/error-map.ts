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

export type ErrorMap = {
  [key in CommonORPCErrorCode | (string & {})]?: ErrorMapItem<Schema>
}

/**
 * `U` extends `ErrorMap` & `ErrorMapGuard<TErrorMap>`
 *
 * `ErrorMapGuard` is a utility type that ensures `U` cannot redefine the structure of `TErrorMap`.
 * It achieves this by setting each key in `TErrorMap` to `never`, effectively preventing any redefinition.
 *
 * **Note:** This type alone doesn't prevent users from setting properties to `undefined`.
 * To fully prevent this behavior and avoid side effects, use it in conjunction with `PreventNever`.
 *
 */
export type ErrorMapGuard<T extends ErrorMap> = {
  [K in keyof T]?: never
}
