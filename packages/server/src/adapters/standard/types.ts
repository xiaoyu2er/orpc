import type { ORPCError } from '@orpc/client'
import type { HTTPPath } from '@orpc/contract'
import type { StandardRequest, StandardResponse } from '@orpc/server-standard'
import type { AnyProcedure } from '../../procedure'
import type { AnyRouter } from '../../router'

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
