export type Context = Record<string, unknown> | undefined

export type MergeContext<TA extends Context, TB extends Context> = TA extends undefined
  ? TB
  : TB extends undefined
  ? TA
  : TA & TB

export type Promisable<T> = T | Promise<T>
