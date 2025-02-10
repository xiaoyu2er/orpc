import type { ClientContext, ClientOptions } from '@orpc/contract'

export interface ClientLink<TClientContext extends ClientContext> {
  call(path: readonly string[], input: unknown, options: ClientOptions<TClientContext>): Promise<unknown>
}
