import type { MaybeOptionalOptions } from '@orpc/shared'
import type { ToFetchResponseOptions } from '@orpc/standard-server-fetch'
import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardHandleOptions, StandardRPCHandlerOptions } from '../standard'
import type { FetchHandler, FetchHandleResult } from './types'
import { StandardRPCJsonSerializer, StandardRPCSerializer } from '@orpc/client/standard'
import { toFetchResponse, toStandardLazyRequest } from '@orpc/standard-server-fetch'
import { StandardHandler, StandardRPCCodec, StandardRPCMatcher } from '../standard'

export class RPCHandler<T extends Context> implements FetchHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<any, T>, options: NoInfer<StandardRPCHandlerOptions<T>> = {}) {
    const jsonSerializer = new StandardRPCJsonSerializer(options)
    const serializer = new StandardRPCSerializer(jsonSerializer)
    const matcher = new StandardRPCMatcher()
    const codec = new StandardRPCCodec(serializer)

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
