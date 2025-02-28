import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Context } from '../../context'
import type { Router } from '../../router'
import type { RPCHandlerOptions, StandardHandleOptions } from '../standard'
import type { FetchHandler, FetchHandleResult } from './types'
import { toFetchResponse, toStandardRequest } from '@orpc/standard-server-fetch'
import { RPCCodec, RPCMatcher, StandardHandler } from '../standard'

export class RPCHandler<T extends Context> implements FetchHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<T, any>, options?: NoInfer<RPCHandlerOptions<T>>) {
    const matcher = options?.matcher ?? new RPCMatcher()
    const codec = options?.codec ?? new RPCCodec()
    this.standardHandler = new StandardHandler(router, matcher, codec, options)
  }

  async handle(request: Request, ...rest: MaybeOptionalOptions<StandardHandleOptions<T>>): Promise<FetchHandleResult> {
    const standardRequest = toStandardRequest(request)

    const result = await this.standardHandler.handle(standardRequest, ...rest)

    if (!result.matched) {
      return result
    }

    return {
      matched: true,
      response: toFetchResponse(result.response, rest[0] ?? {}),
    }
  }
}
