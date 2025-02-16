import type { ClientContext, ClientOptions } from '@orpc/contract'

export type ClientOptionsOut<TClientContext extends ClientContext> = ClientOptions<TClientContext> & {
  context: TClientContext
}

export interface ClientLink<TClientContext extends ClientContext> {
  call(path: readonly string[], input: unknown, options: ClientOptionsOut<TClientContext>): Promise<unknown>
}
