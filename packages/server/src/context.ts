import type { IsNever } from '@orpc/shared'

export type Context = Record<string, any>

export type ConflictContextGuard<T extends Context> =
    true extends { [K in keyof T]: IsNever<T[K]> }[keyof T]
      ? 'Conflict context detected: Please ensure your middlewares do not return conflicting context'
      : unknown
