import { WELL_DEFINED_PROCEDURE } from './procedure'

export type Context = Record<string, unknown> | undefined

export type MergeContext<TA extends Context, TB extends Context> = TA extends undefined
  ? TB
  : TB extends undefined
  ? TA
  : TA & TB

export interface Meta<T> extends Hooks<T> {
  path: string
  procedure: WELL_DEFINED_PROCEDURE
}

export type Promisable<T> = T | Promise<T>

export type UndefinedProperties<T> = {
  [P in keyof T]-?: undefined extends T[P] ? P : never
}[keyof T]

export type OptionalOnUndefined<T> = Partial<Pick<T, UndefinedProperties<T>>> &
  Pick<T, Exclude<keyof T, UndefinedProperties<T>>>

export interface UnsubscribeFn {
  (): void
}

export interface HookOptions {
  mode: 'unshift' | 'push'
}

export interface Hooks<T> {
  onSuccess: (fn: (output: T) => Promisable<void>, opts?: HookOptions) => UnsubscribeFn
  onError: (fn: (error: unknown) => Promisable<void>, opts?: HookOptions) => UnsubscribeFn
  onFinish: (
    fn: (output: T | undefined, error: unknown | undefined) => Promisable<void>,
    opts?: HookOptions
  ) => UnsubscribeFn
}
