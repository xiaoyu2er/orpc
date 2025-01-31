import type { ClientOptions } from '@orpc/contract'

export interface ClientLink<TClientContext> {
  call(path: readonly string[], input: unknown, options: ClientOptions<TClientContext>): Promise<unknown>
}
