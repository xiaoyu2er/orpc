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
