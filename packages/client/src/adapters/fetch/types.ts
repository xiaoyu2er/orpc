export interface FetchWithContext<TClientContext> {
  (url: Request | string | URL, init: RequestInit | undefined, context: TClientContext): Promise<Response>
}
