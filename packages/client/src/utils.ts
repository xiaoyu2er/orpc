import type { ORPCError } from './error'
import type { ClientContext, ClientOptions, ClientPromiseResult, FriendlyClientOptions } from './types'
import { isDefinedError } from './error'

export type SafeResult<TOutput, TError> =
  | [error: null, data: TOutput, isDefined: false, status: 'success']
  & { error: null, data: TOutput, isDefined: false, status: 'success' }
  | [error: Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false, status: 'error']
  & { error: Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false, status: 'error' }
  | [error: Extract<TError, ORPCError<any, any>>, data: undefined, isDefined: true, status: 'error']
  & { error: Extract<TError, ORPCError<any, any>>, data: undefined, isDefined: true, status: 'error' }

export async function safe<TOutput, TError>(promise: ClientPromiseResult<TOutput, TError>): Promise<SafeResult<TOutput, TError>> {
  try {
    const output = await promise
    return Object.assign(
      [null, output, false, 'success'] satisfies [null, TOutput, false, 'success'],
      { error: null, data: output, isDefined: false as const, status: 'success' as const },
    )
  }
  catch (e) {
    const error = e as TError

    if (isDefinedError(error)) {
      return Object.assign(
        [error, undefined, true, 'error'] satisfies [typeof error, undefined, true, 'error'],
        { error, data: undefined, isDefined: true as const, status: 'error' as const },
      )
    }

    return Object.assign(
      [error as Exclude<TError, ORPCError<any, any>>, undefined, false, 'error'] satisfies [Exclude<TError, ORPCError<any, any>>, undefined, false, 'error'],
      { error: error as Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false as const, status: 'error' as const },
    )
  }
}

export function resolveFriendlyClientOptions<T extends ClientContext>(options: FriendlyClientOptions<T>): ClientOptions<T> {
  return {
    ...options,
    context: options?.context ?? {} as T, // Context only optional if all fields are optional
  }
}
