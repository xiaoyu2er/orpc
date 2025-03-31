import type { PromiseWithError } from '@orpc/shared'

export type HTTPPath = `/${string}`
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type ClientContext = Record<PropertyKey, any>

export type FriendlyClientOptions<TClientContext extends ClientContext> =
  & { signal?: AbortSignal, lastEventId?: string | undefined }
  & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })

export type ClientRest<TClientContext extends ClientContext, TInput> = Record<never, never> extends TClientContext
  ? undefined extends TInput
    ? [input?: TInput, options?: FriendlyClientOptions<TClientContext>]
    : [input: TInput, options?: FriendlyClientOptions<TClientContext>]
  : [input: TInput, options: FriendlyClientOptions<TClientContext>]

export type ClientPromiseResult<TOutput, TError> = PromiseWithError<TOutput, TError>

export interface Client<TClientContext extends ClientContext, TInput, TOutput, TError> {
  (...rest: ClientRest<TClientContext, TInput>): ClientPromiseResult<TOutput, TError>
}

export type NestedClient<TClientContext extends ClientContext> = Client<TClientContext, any, any, any> | {
  [k: string]: NestedClient<TClientContext>
}

export type InferClientContext<T extends NestedClient<any>> = T extends NestedClient<infer U> ? U : never

export type ClientOptions<TClientContext extends ClientContext> = FriendlyClientOptions<TClientContext> & {
  context: TClientContext
}

export interface ClientLink<TClientContext extends ClientContext> {
  call: (path: readonly string[], input: unknown, options: ClientOptions<TClientContext>) => Promise<unknown>
}
