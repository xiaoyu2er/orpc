import type { Context, Router } from '@orpc/server'
import type { FetchHandler, FetchHandleResult } from '@orpc/server/fetch'
import type { StandardHandleOptions, StandardHandlerOptions } from '@orpc/server/standard'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { ToFetchResponseOptions } from '@orpc/standard-server-fetch'
import { OpenAPISerializer } from '@orpc/openapi-client/standard'
import { StandardHandler } from '@orpc/server/standard'
import { toFetchResponse, toStandardLazyRequest } from '@orpc/standard-server-fetch'
import { OpenAPICodec, OpenAPIMatcher } from '../standard'

export class OpenAPIHandler<T extends Context> implements FetchHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<T, any>, options: NoInfer<StandardHandlerOptions<T>> = {}) {
    const serializer = new OpenAPISerializer()
    const matcher = new OpenAPIMatcher()
    const codec = new OpenAPICodec(serializer)

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
