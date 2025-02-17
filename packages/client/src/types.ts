export type ClientContext = Record<string, any>

export type ClientOptions<TClientContext extends ClientContext> =
  & { signal?: AbortSignal, lastEventId?: string | undefined }
  & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })

export type ClientRest<TClientContext extends ClientContext, TInput> =
  | [input: TInput, options: ClientOptions<TClientContext>]
  | (Record<never, never> extends TClientContext ? (undefined extends TInput ? [input?: TInput] : [input: TInput]) : never)

export type ClientPromiseResult<TOutput, TError extends Error> = Promise<TOutput> & { __error?: { type: TError } }

export interface Client<TClientContext extends ClientContext, TInput, TOutput, TError extends Error> {
  (...rest: ClientRest<TClientContext, TInput>): ClientPromiseResult<TOutput, TError>
}

export type NestedClient<TClientContext extends ClientContext> = Client<TClientContext, any, any, any> | {
  [k: string]: NestedClient<TClientContext>
}

export type InferClientContext<T extends NestedClient<any>> = T extends NestedClient<infer U> ? U : never

export type ClientOptionsOut<TClientContext extends ClientContext> = ClientOptions<TClientContext> & {
  context: TClientContext
}

export interface ClientLink<TClientContext extends ClientContext> {
  call: (path: readonly string[], input: unknown, options: ClientOptionsOut<TClientContext>) => Promise<unknown>
}
