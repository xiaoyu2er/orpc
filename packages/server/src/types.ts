import { HTTPMethod, HTTPPath } from '@orpc/contract'

export type Context = Record<string, unknown> | undefined

export type MergeContext<TA extends Context, TB extends Context> = TA extends undefined
  ? TB
  : TB extends undefined
  ? TA
  : TA & TB

export interface Meta {
  method: HTTPMethod
  path: HTTPPath
}

export type Promisable<T> = T | Promise<T>

export type UndefinedProperties<T> = {
  [P in keyof T]-?: undefined extends T[P] ? P : never
}[keyof T]

export type OptionalOnUndefined<T> = Partial<Pick<T, UndefinedProperties<T>>> &
  Pick<T, Exclude<keyof T, UndefinedProperties<T>>>
