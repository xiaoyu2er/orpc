import type { ClientPromiseResult } from './client'
import { isDefinedError, type ORPCError } from './error-orpc'

export type SafeResult<TOutput, TError extends Error> =
  | [output: TOutput, error: undefined, isDefinedError: false]
  | [output: undefined, error: TError, isDefinedError: false]
  | [output: undefined, error: Extract<TError, ORPCError<any, any>>, isDefinedError: true]

export async function safe<TOutput, TError extends Error>(promise: ClientPromiseResult<TOutput, TError>): Promise<SafeResult<TOutput, TError>> {
  try {
    const output = await promise
    return [output, undefined, false]
  }
  catch (e) {
    const error = e as TError

    if (isDefinedError(error)) {
      return [undefined, error, true]
    }

    return [undefined, error, false]
  }
}
