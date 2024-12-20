import type { ANY_PROCEDURE } from './procedure'

export type Context = Record<string, any> | undefined
export type WELL_CONTEXT = Record<string, unknown> | undefined

export type MergeContext<
  TA extends Context,
  TB extends Context,
> = TA extends undefined ? TB : TB extends undefined ? TA : TA & TB

export interface WithSignal {
  signal?: AbortSignal
}

export interface Meta extends WithSignal {
  path: string[]
  procedure: ANY_PROCEDURE
}
