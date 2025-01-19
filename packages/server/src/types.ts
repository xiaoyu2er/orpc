import type { FindGlobalInstanceType } from '@orpc/shared'
import type { ANY_PROCEDURE } from './procedure'

export type AbortSignal = FindGlobalInstanceType<'AbortSignal'>

export interface WithSignal {
  signal?: AbortSignal
}

export interface Meta extends WithSignal {
  path: string[]
  procedure: ANY_PROCEDURE
}
