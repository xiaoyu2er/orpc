import type { WELL_DEFINED_PROCEDURE } from './procedure'

export type Context = Record<string, unknown> | undefined

export type MergeContext<
  TA extends Context,
  TB extends Context,
> = TA extends undefined ? TB : TB extends undefined ? TA : TA & TB

export interface Meta {
  path: string[]
  internal: boolean
  procedure: WELL_DEFINED_PROCEDURE
}
