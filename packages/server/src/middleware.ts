import type { Promisable } from '@orpc/shared'
import type { Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { ANY_PROCEDURE } from './procedure'
import type { AbortSignal } from './types'

export type MiddlewareResult<TOutContext extends Context, TOutput> = Promisable<{
  output: TOutput
  context: TOutContext
}>

export interface MiddlewareNextFn<TInContext extends Context, TOutput> {
  <U extends Context & Partial<TInContext> = Record<never, never>>(options?: { context?: U }): MiddlewareResult<U, TOutput>
}

export interface MiddlewareOutputFn<TOutput> {
  (output: TOutput): MiddlewareResult<Record<never, never>, TOutput>
}

export interface MiddlewareOptions<
  TInContext extends Context,
  TOutput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
> {
  context: TInContext
  path: string[]
  procedure: ANY_PROCEDURE
  signal?: AbortSignal
  next: MiddlewareNextFn<TInContext, TOutput>
  errors: TErrorConstructorMap
}

export interface Middleware<
  TInContext extends Context,
  TOutContext extends Context,
  TInput,
  TOutput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
> {
  (
    options: MiddlewareOptions<TInContext, TOutput, TErrorConstructorMap>,
    input: TInput,
    output: MiddlewareOutputFn<TOutput>,
  ): Promisable<
    MiddlewareResult<TOutContext, TOutput>
  >
}

export type ANY_MIDDLEWARE = Middleware<any, any, any, any, any>

export interface MapInputMiddleware<TInput, TMappedInput> {
  (input: TInput): TMappedInput
}

export type ANY_MAP_INPUT_MIDDLEWARE = MapInputMiddleware<any, any>

export function middlewareOutputFn<TOutput>(output: TOutput): MiddlewareResult<Record<never, never>, TOutput> {
  return { output, context: {} }
}
