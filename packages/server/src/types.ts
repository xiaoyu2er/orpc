import { IsAnyOrEqual } from '@orpc/contract'

export type Context = Record<string, unknown>

export type MergeContext<TA extends Context, TB extends Context> = IsAnyOrEqual<
  TA,
  Context
> extends true
  ? TB
  : IsAnyOrEqual<TB, Context> extends true
  ? TA
  : Omit<TA, keyof TB> & TB

export type Promisable<T> = T | Promise<T>
