import type { Context } from './types'

/**
 * U extends Context & ContextGuard<TContext>
 *
 * Purpose:
 *  - Ensures that any extension `U` of `Context` must conform to the current `TContext`.
 * - This is useful when redefining `TContext` to maintain type compatibility with the existing context.
 *
 */
export type ContextGuard<T extends Context> = Partial<T> | undefined
