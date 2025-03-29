import type { Client, ORPCError, ORPCErrorJSON } from '@orpc/client'
import { toORPCError } from '@orpc/client'

export type ActionableClient<TInput, TOutput, TError extends Error> =
  (...rest: undefined extends TInput ? [input?: TInput] : [input: TInput]) => Promise<
    | [error: null, data: TOutput]
    | [error: TError extends ORPCError<infer U, infer V> ? ORPCErrorJSON<U, V> & { defined: true } : ORPCError<string, unknown> & { defined: false }, data: undefined]
  >

export function createActionableClient<TInput, TOutput, TError extends Error>(
  client: Client<Record<never, never>, TInput, TOutput, TError>,
): ActionableClient<TInput, TOutput, TError> {
  const action = async (input: TInput) => {
    try {
      return [null, await client(input)]
    }
    catch (error) {
      return [toORPCError(error).toJSON(), undefined]
    }
  }

  return action as any
}
