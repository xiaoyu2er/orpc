import type { Context, MergeContext } from './types'

export function mergeContext<A extends Context, B extends Context>(
  a: A,
  b: B,
): MergeContext<A, B> {
  if (!a)
    return b as any
  if (!b)
    return a as any

  return {
    ...a,
    ...b,
  } as any
}
