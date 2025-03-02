import type { MaybeOptionalOptions } from '@orpc/shared'
import type { ToFetchResponseOptions } from '@orpc/standard-server-fetch'
import type { Context } from '../../context'
import type { Router } from '../../router'
import type { RPCHandlerOptions, StandardHandleOptions } from '../standard'
import type { FetchHandler, FetchHandleResult } from './types'
import { toFetchResponse, toLazyStandardRequest } from '@orpc/standard-server-fetch'
import { RPCCodec, RPCMatcher, StandardHandler } from '../standard'

export class RPCHandler<T extends Context> implements FetchHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<T, any>, options?: NoInfer<RPCHandlerOptions<T>>) {
    const matcher = options?.matcher ?? new RPCMatcher()
    const codec = options?.codec ?? new RPCCodec()
    this.standardHandler = new StandardHandler(router, matcher, codec, options)
  }

  async handle(
    request: Request,
    ...[options]: MaybeOptionalOptions<StandardHandleOptions<T> & ToFetchResponseOptions>
  ): Promise<FetchHandleResult> {
    const standardRequest = toLazyStandardRequest(request)

    const result = await this.standardHandler.handle(standardRequest, options as any)

    if (!result.matched) {
      return result
    }

    return {
      matched: true,
      response: toFetchResponse(result.response, options),
    }
  }
}
