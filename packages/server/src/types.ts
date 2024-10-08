import type { WELL_DEFINED_PROCEDURE } from './procedure'

export type Context = Record<string, unknown> | undefined

export type MergeContext<
  TA extends Context,
  TB extends Context,
> = TA extends undefined ? TB : TB extends undefined ? TA : TA & TB

export interface Meta<T> extends Hooks<T> {
  path: string[]
  internal: boolean
  procedure: WELL_DEFINED_PROCEDURE
}

export type Promisable<T> = T | Promise<T>

export interface UnsubscribeFn {
  (): void
}

export interface Hooks<T> {
  onSuccess: (fn: (output: T) => Promisable<void>) => UnsubscribeFn
  onError: (fn: (error: unknown) => Promisable<void>) => UnsubscribeFn
  onFinish: (
    fn: (output: T | undefined, error: unknown | undefined) => Promisable<void>,
  ) => UnsubscribeFn
}
