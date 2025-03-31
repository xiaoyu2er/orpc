import type { ORPCError } from './error'
import type { ClientContext, ClientOptions, ClientPromiseResult, FriendlyClientOptions } from './types'
import { isDefinedError } from './error'

export type SafeResult<TOutput, TError> =
  | [error: null, data: TOutput, isDefined: false, success: true]
  & { error: null, data: TOutput, isDefined: false, success: true }
  | [error: Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false, success: false]
  & { error: Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false, success: false }
  | [error: Extract<TError, ORPCError<any, any>>, data: undefined, isDefined: true, success: false]
  & { error: Extract<TError, ORPCError<any, any>>, data: undefined, isDefined: true, success: false }

export async function safe<TOutput, TError>(promise: ClientPromiseResult<TOutput, TError>): Promise<SafeResult<TOutput, TError>> {
  try {
    const output = await promise
    return Object.assign(
      [null, output, false, true] satisfies [null, TOutput, false, true],
      { error: null, data: output, isDefined: false as const, success: true as const },
    )
  }
  catch (e) {
    const error = e as TError

    if (isDefinedError(error)) {
      return Object.assign(
        [error, undefined, true, false] satisfies [typeof error, undefined, true, false],
        { error, data: undefined, isDefined: true as const, success: false as const },
      )
    }

    return Object.assign(
      [error as Exclude<TError, ORPCError<any, any>>, undefined, false, false] satisfies [Exclude<TError, ORPCError<any, any>>, undefined, false, false],
      { error: error as Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false as const, success: false as const },
    )
  }
}

export function resolveFriendlyClientOptions<T extends ClientContext>(options: FriendlyClientOptions<T>): ClientOptions<T> {
  return {
    ...options,
    context: options?.context ?? {} as T, // Context only optional if all fields are optional
  }
}
