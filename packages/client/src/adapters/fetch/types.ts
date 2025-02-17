import type { ClientContext, ClientOptionsOut } from '../../types'

export interface FetchWithContext<TClientContext extends ClientContext> {
  (
    url: URL,
    init: RequestInit,
    options: ClientOptionsOut<TClientContext>,
    path: readonly string[],
    input: unknown,
  ): Promise<Response>
}
