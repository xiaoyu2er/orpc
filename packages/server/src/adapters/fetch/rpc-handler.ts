import type { MaybeOptionalOptions } from '@orpc/shared'
import type { ToFetchResponseOptions } from '@orpc/standard-server-fetch'
import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardHandleOptions, StandardHandlerOptions } from '../standard'
import type { FetchHandler, FetchHandleResult } from './types'
import { RPCSerializer } from '@orpc/client/standard'
import { toFetchResponse, toStandardLazyRequest } from '@orpc/standard-server-fetch'
import { RPCCodec, RPCMatcher, StandardHandler } from '../standard'

export class RPCHandler<T extends Context> implements FetchHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<T, any>, options: NoInfer<StandardHandlerOptions<T>> = {}) {
    const serializer = new RPCSerializer()
    const matcher = new RPCMatcher()
    const codec = new RPCCodec(serializer)

    this.standardHandler = new StandardHandler(router, matcher, codec, options)
  }

  async handle(
    request: Request,
    ...[
      options = {} as StandardHandleOptions<T> & ToFetchResponseOptions,
    ]: MaybeOptionalOptions<StandardHandleOptions<T> & ToFetchResponseOptions>
  ): Promise<FetchHandleResult> {
    const standardRequest = toStandardLazyRequest(request)

    const result = await this.standardHandler.handle(standardRequest, options)

    if (!result.matched) {
      return result
    }

    return {
      matched: true,
      response: toFetchResponse(result.response, options),
    }
  }
}
