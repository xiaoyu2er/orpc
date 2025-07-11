import type { ThrowableError } from '@orpc/shared'
import type { ORPCError } from './error'
import type { ClientContext, ClientOptions, ClientPromiseResult, FriendlyClientOptions, NestedClient } from './types'
import { isDefinedError } from './error'

export type SafeResult<TOutput, TError>
  = | [error: null, data: TOutput, isDefined: false, isSuccess: true]
  & { error: null, data: TOutput, isDefined: false, isSuccess: true }
  | [error: Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false, isSuccess: false]
  & { error: Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false, isSuccess: false }
  | [error: Extract<TError, ORPCError<any, any>>, data: undefined, isDefined: true, isSuccess: false]
  & { error: Extract<TError, ORPCError<any, any>>, data: undefined, isDefined: true, isSuccess: false }

/**
 * Works like try/catch, but can infer error types.
 *
 * @info support both tuple `[error, data, isDefined, isSuccess]` and object `{ error, data, isDefined, isSuccess }` styles.
 * @see {@link https://orpc.unnoq.com/docs/client/error-handling Client Error Handling Docs}
 */
export async function safe<TOutput, TError = ThrowableError>(promise: ClientPromiseResult<TOutput, TError>): Promise<SafeResult<TOutput, TError>> {
  try {
    const output = await promise
    return Object.assign(
      [null, output, false, true] satisfies [null, TOutput, false, true],
      { error: null, data: output, isDefined: false as const, isSuccess: true as const },
    )
  }
  catch (e) {
    const error = e as TError

    if (isDefinedError(error)) {
      return Object.assign(
        [error, undefined, true, false] satisfies [typeof error, undefined, true, false],
        { error, data: undefined, isDefined: true as const, isSuccess: false as const },
      )
    }

    return Object.assign(
      [error as Exclude<TError, ORPCError<any, any>>, undefined, false, false] satisfies [Exclude<TError, ORPCError<any, any>>, undefined, false, false],
      { error: error as Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false as const, isSuccess: false as const },
    )
  }
}

export function resolveFriendlyClientOptions<T extends ClientContext>(options: FriendlyClientOptions<T>): ClientOptions<T> {
  return {
    ...options,
    context: options.context ?? {} as T, // Context only optional if all fields are optional
  }
}

/**
 * Transform a client type to return safe results
 */
export type SafeClient<T extends NestedClient<any>> = T extends (...args: infer A) => ClientPromiseResult<infer O, infer E>
  ? (...args: A) => Promise<SafeResult<O, E>>
  : T extends Record<PropertyKey, any>
    ? { [K in keyof T]: SafeClient<T[K]> }
    : never

/**
 * Create a safe client that automatically wraps all procedure calls with the safe function.
 *
 * @param client - The original oRPC client
 * @returns A safe client where all methods return SafeResult instead of throwing errors
 *
 * @example
 * ```ts
 * const safeClient = createSafeClient(client)
 * const { error, data, isDefined } = await safeClient.doSomething({ id: '123' })
 * ```
 *
 * @see {@link https://orpc.unnoq.com/docs/client/error-handling Client Error Handling Docs}
 */
export function createSafeClient<T extends NestedClient<any>>(client: T): SafeClient<T> {
  const createSafeProxy = (target: any): any => {
    return new Proxy(target, {
      get(targetObj, prop, receiver) {
        // For non-string properties, use default behavior
        if (typeof prop !== 'string') {
          return Reflect.get(targetObj, prop, receiver)
        }

        const value = Reflect.get(targetObj, prop, receiver)

        // If we get a function/object (nested client or function), wrap it with safe proxy
        if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
          return createSafeProxy(value)
        }

        // For all other properties, return as-is
        return value
      },

      apply(target, thisArg, argumentsList) {
        // When the proxy itself is called as a function (procedure call)
        const result = Reflect.apply(target, thisArg, argumentsList) as ClientPromiseResult<any, any>
        return safe(result)
      },
    })
  }

  return createSafeProxy(client) as SafeClient<T>
}
