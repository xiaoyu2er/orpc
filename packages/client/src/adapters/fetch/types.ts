import type { ClientContext } from '@orpc/contract'

export interface FetchWithContext<TClientContext extends ClientContext> {
  (url: URL, init: RequestInit, context: TClientContext): Promise<Response>
}
