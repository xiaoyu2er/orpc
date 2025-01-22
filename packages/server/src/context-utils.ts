import type { IsNever } from '@orpc/shared'
import type { Context } from './context'

export type MergedContext<T extends Context, U extends Context> = T & U

export function mergeContext<T extends Context, U extends Context>(
  context: T,
  other: U,
): MergedContext<T, U> {
  return { ...context, ...other }
}

export type ConflictContextGuard<T extends Context> =
    true extends IsNever<T> | { [K in keyof T]: IsNever<T[K]> }[keyof T]
      ? never // 'Conflict context detected: Please ensure your middlewares do not return conflicting context'
      : unknown
