import type { AbortSignal } from './types'

export type ClientOptions<TClientContext> =
  & { signal?: AbortSignal }
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })

export type ClientPromiseResult<TOutput, TError extends Error> = Promise<TOutput> & { __typeError?: TError }

export interface Client<TClientContext, TInput, TOutput, TError extends Error> {
  (...opts:
    | [input: TInput, options: ClientOptions<TClientContext>]
    | (undefined extends TInput & TClientContext ? [] : never)
    | (undefined extends TClientContext ? [input: TInput] : never)
  ): ClientPromiseResult<TOutput, TError>
}

export type NestedClient<TClientContext> = Client<TClientContext, any, any, any> | {
  [k: string]: NestedClient<TClientContext>
}
