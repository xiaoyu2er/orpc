import type { ORPCErrorCode } from './error-orpc'
import type { Schema } from './schema'

export type ErrorMapItem<TDataSchema extends Schema> = {
  status?: number
  message?: string
  description?: string
  data?: TDataSchema
}

export type ErrorMap = {
  [key in ORPCErrorCode]?: ErrorMapItem<Schema>
}

export type MergedErrorMap<T1 extends ErrorMap, T2 extends ErrorMap> = Omit<T1, keyof T2> & T2

export function mergeErrorMap<T1 extends ErrorMap, T2 extends ErrorMap>(errorMap1: T1, errorMap2: T2): MergedErrorMap<T1, T2> {
  return { ...errorMap1, ...errorMap2 }
}
