import type { AbortSignal, HTTPPath, ORPCError } from '@orpc/contract'
import type { JsonValue } from '@orpc/shared'
import type { AnyProcedure } from '../../procedure'
import type { AnyRouter } from '../../router'

export interface StandardHeaders {
  [key: string]: string | string[] | undefined
}

export type StandardBody = undefined | JsonValue | Blob | URLSearchParams | FormData

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
  body(): Promise<StandardBody>

  signal?: AbortSignal
}

export interface StandardResponse {
  status: number
  headers: StandardHeaders
  body: StandardBody
}

export type StandardParams = Record<string, string>

export type StandardMatchResult = {
  path: string[]
  procedure: AnyProcedure
  params?: StandardParams
} | undefined

export interface StandardMatcher {
  init(router: AnyRouter): void
  match(method: string, pathname: HTTPPath): Promise<StandardMatchResult>
}

export interface StandardCodec {
  encode(output: unknown, procedure: AnyProcedure): StandardResponse
  encodeError(error: ORPCError<any, any>): StandardResponse
  decode(request: StandardRequest, params: StandardParams | undefined, procedure: AnyProcedure): Promise<unknown>
}
