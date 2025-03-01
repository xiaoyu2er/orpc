export interface StandardHeaders {
  [key: string]: string | string[] | undefined
}

export type StandardBody =
  | undefined
  | unknown
  | Blob
  | URLSearchParams
  | FormData
  | AsyncIterator<unknown | void, unknown | void, undefined>

export interface StandardRequest {
  /**
   * Can be { request: Request } or { request: IncomingMessage, response: ServerResponse } based on the adapter.
   */
  raw: Record<string, unknown>

  method: string
  url: URL
  headers: StandardHeaders

  /**
   * The body has been parsed base on the content-type header.
   * This method can safely call multiple times (cached).
   */
  body: () => Promise<StandardBody>

  signal: AbortSignal | undefined
}

export interface StandardResponse {
  status: number
  headers: StandardHeaders
  body: StandardBody
}

export interface StandardServerEventSourceOptions {
  /**
   * If true, a ping comment is sent periodically to keep the connection alive.
   *
   * @default true
   */
  eventSourcePingEnabled?: boolean

  /**
   * Interval (in milliseconds) between ping comments sent after the last event.
   *
   * @default 5000
   */
  eventSourcePingInterval?: number

  /**
   * The content of the ping comment. Must not include newline characters.
   *
   * @default ''
   */
  eventSourcePingContent?: string
}
