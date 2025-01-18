import type { IsNever } from '@orpc/shared'

export type Context = Record<string, any>

export type TypeInitialContext<T extends Context> = (type: T) => any

export type TypeCurrentContext<T extends Context> = { type: T }

export type ConflictContextGuard<T extends Context> =
    true extends IsNever<T> | { [K in keyof T]: IsNever<T[K]> }[keyof T]
      ? never // 'Conflict context detected: Please ensure your middlewares do not return conflicting context'
      : unknown
