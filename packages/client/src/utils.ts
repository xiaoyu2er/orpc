import type { ORPCError } from './error'
import type { ClientContext, ClientOptions, ClientPromiseResult, FriendlyClientOptions } from './types'
import { isDefinedError } from './error'

export type SafeResult<TOutput, TError extends Error> =
  | [error: null, data: TOutput, isDefined: false]
  & { error: null, data: TOutput, isDefined: false }
  | [error: Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false]
  & { error: Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false }
  | [error: Extract<TError, ORPCError<any, any>>, data: undefined, isDefined: true]
  & { error: Extract<TError, ORPCError<any, any>>, data: undefined, isDefined: true }

export async function safe<TOutput, TError extends Error>(promise: ClientPromiseResult<TOutput, TError>): Promise<SafeResult<TOutput, TError>> {
  try {
    const output = await promise
    return Object.assign(
      [null, output, false] satisfies [null, TOutput, false],
      { error: null, data: output, isDefined: false as const },
    )
  }
  catch (e) {
    const error = e as TError

    if (isDefinedError(error)) {
      return Object.assign(
        [error, undefined, true] satisfies [typeof error, undefined, true],
        { error, data: undefined, isDefined: true as const },
      )
    }

    return Object.assign(
      [error as Exclude<TError, ORPCError<any, any>>, undefined, false] satisfies [Exclude<TError, ORPCError<any, any>>, undefined, false],
      { error: error as Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false as const },
    )
  }
}

export function resolveFriendlyClientOptions<T extends ClientContext>(options: FriendlyClientOptions<T>): ClientOptions<T> {
  return {
    ...options,
    context: options?.context ?? {} as T, // Context only optional if all fields are optional
  }
}
