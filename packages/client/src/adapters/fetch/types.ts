import type { ClientContext, ClientOptions } from '../../types'

export interface FetchWithContext<TClientContext extends ClientContext> {
  (
    url: URL,
    init: RequestInit,
    options: ClientOptions<TClientContext>,
    path: readonly string[],
    input: unknown,
  ): Promise<Response>
}
