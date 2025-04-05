import type { Promisable } from 'type-fest'
import type { PromiseWithError, ThrowableError } from './types'

export type InterceptableOptions = Record<string, any>

export type InterceptorOptions<
  TOptions extends InterceptableOptions,
  TResult,
  TError,
> = Omit<TOptions, 'next'> & {
  next(options?: TOptions): PromiseWithError<TResult, TError>
}

export type Interceptor<
  TOptions extends InterceptableOptions,
  TResult,
  TError,
> = (options: InterceptorOptions<TOptions, TResult, TError>) => Promisable<TResult>

/**
 * Can used for interceptors or middlewares
 */
export function onStart<T, TOptions extends { next(): any }, TRest extends any[]>(
  callback: NoInfer<(options: TOptions, ...rest: TRest) => Promisable<void>>,
): (options: TOptions, ...rest: TRest) => T | Promise<Awaited<ReturnType<TOptions['next']>>> {
  return async (options, ...rest) => {
    await callback(options, ...rest)
    return await options.next()
  }
}

/**
 * Can used for interceptors or middlewares
 */
export function onSuccess<T, TOptions extends { next(): any }, TRest extends any[]>(
  callback: NoInfer<(result: Awaited<ReturnType<TOptions['next']>>, options: TOptions, ...rest: TRest) => Promisable<void>>,
): (options: TOptions, ...rest: TRest) => T | Promise<Awaited<ReturnType<TOptions['next']>>> {
  return async (options, ...rest) => {
    const result = await options.next()
    await callback(result, options, ...rest)
    return result
  }
}

/**
 * Can used for interceptors or middlewares
 */
export function onError<T, TOptions extends { next(): any }, TRest extends any[]>(
  callback: NoInfer<(
    error: ReturnType<TOptions['next']> extends PromiseWithError<any, infer E> ? E : ThrowableError,
    options: TOptions,
    ...rest: TRest
  ) => Promisable<void>>,
): (options: TOptions, ...rest: TRest) => T | Promise<Awaited<ReturnType<TOptions['next']>>> {
  return async (options, ...rest) => {
    try {
      return await options.next()
    }
    catch (error) {
      await callback(error as any, options, ...rest)
      throw error
    }
  }
}

export type OnFinishState<TResult, TError> =
  | [error: TError, data: undefined, isSuccess: false]
  | [error: null, data: TResult, isSuccess: true]

/**
 * Can used for interceptors or middlewares
 */
export function onFinish<T, TOptions extends { next(): any }, TRest extends any[]>(
  callback: NoInfer<(
    state: OnFinishState<
      Awaited<ReturnType<TOptions['next']>>,
      ReturnType<TOptions['next']> extends PromiseWithError<any, infer E> ? E : ThrowableError
    >,
    options: TOptions,
    ...rest: TRest
  ) => Promisable<void>>,
): (options: TOptions, ...rest: TRest) => T | Promise<Awaited<ReturnType<TOptions['next']>>> {
  let state: any

  return async (options, ...rest) => {
    try {
      const result = await options.next()
      state = [null, result, true]
      return result
    }
    catch (error) {
      state = [error, undefined, false]
      throw error
    }
    finally {
      await callback(state, options, ...rest)
    }
  }
}

export async function intercept<TOptions extends InterceptableOptions, TResult, TError>(
  interceptors: Interceptor<TOptions, TResult, TError>[],
  options: NoInfer<TOptions>,
  main: NoInfer<(options: TOptions) => Promisable<TResult>>,
): Promise<TResult> {
  let index = 0

  const next = async (options: TOptions): Promise<TResult> => {
    const interceptor = interceptors[index++]

    if (!interceptor) {
      return await main(options)
    }

    return await interceptor({
      ...options,
      next: (newOptions: TOptions = options) => next(newOptions),
    })
  }

  return await next(options)
}
