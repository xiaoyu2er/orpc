import type { CommonORPCErrorCode } from './error-orpc'
import type { Schema } from './types'

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

export type ErrorMap = {
  [key in CommonORPCErrorCode | (string & {})]?: ErrorMapItem<Schema>
}

// FIXME: current this cannot prevent user pass undefined to override the old errorMap
// But it's not a big deal since after merge the new errorMap will be never
export type PreventOverrideErrorMap<TErrorMap extends ErrorMap> = {
  [K in keyof TErrorMap]?: never
}
