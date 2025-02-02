import type { AbortSignal, ORPCError } from '@orpc/contract'
import type { AnyProcedure } from '../../procedure'
import type { AnyRouter } from '../../router'

export interface StandardHeaders {
  [key: string]: string | string[] | undefined
}

export interface StandardRequest {
  method: string
  url: URL
  headers: StandardHeaders

  /**
   * The body has been parsed base on the content-type header.
   * The result can be <string | JSON Value | Blob | FormData>.
   * This method can safely call multiple times (cached).
   */
  body(): Promise<unknown>

  signal?: AbortSignal
}

export interface StandardResponse {
  status: number
  headers: StandardHeaders

  /**
   * Accepts <string | JSON Value | Blob | FormData>.
   */
  body: unknown
}

export type StandardParams = Record<string, string>

export type StandardMatchResult = {
  path: string[]
  procedure: AnyProcedure
  params?: StandardParams
} | undefined

export interface StandardMatcher {
  init(router: AnyRouter): void
  match(method: string, pathname: string): Promise<StandardMatchResult>
}

export interface StandardCodec {
  encode(output: unknown, procedure: AnyProcedure): StandardResponse
  encodeError(error: ORPCError<any, any>): StandardResponse
  decode(request: StandardRequest, params: StandardParams | undefined, procedure: AnyProcedure): unknown
}
