import { IsAnyOrEqual } from '@orpc/contract'

export type ServerContext = Record<string, unknown>
export type MergeServerContext<TA extends ServerContext, TB extends ServerContext> = IsAnyOrEqual<
  TA,
  ServerContext
> extends true
  ? TB
  : IsAnyOrEqual<TB, ServerContext> extends true
  ? TA
  : Omit<TA, keyof TB> & TB

export type Promisable<T> = T | Promise<T>
