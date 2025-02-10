import type { ClientContext } from '@orpc/contract'

export interface FetchWithContext<TClientContext extends ClientContext> {
  (url: Request | string | URL, init: RequestInit | undefined, context: TClientContext): Promise<Response>
}
