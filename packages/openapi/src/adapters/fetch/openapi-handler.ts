import type { Context, Router } from '@orpc/server'
import type { FetchHandler, FetchHandleResult } from '@orpc/server/fetch'
import type { StandardHandleOptions } from '@orpc/server/standard'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { ToFetchResponseOptions } from '@orpc/standard-server-fetch'
import type { OpenAPIHandlerOptions } from '../standard'
import { StandardHandler } from '@orpc/server/standard'
import { toFetchResponse, toStandardRequest } from '@orpc/standard-server-fetch'
import { OpenAPICodec, OpenAPIMatcher } from '../standard'

export class OpenAPIHandler<T extends Context> implements FetchHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<T, any>, options?: NoInfer<OpenAPIHandlerOptions<T>>) {
    const matcher = options?.matcher ?? new OpenAPIMatcher()
    const codec = options?.codec ?? new OpenAPICodec()

    this.standardHandler = new StandardHandler(router, matcher, codec, options)
  }

  async handle(
    request: Request,
    ...[options]: MaybeOptionalOptions<StandardHandleOptions<T> & ToFetchResponseOptions>
  ): Promise<FetchHandleResult> {
    const standardRequest = toStandardRequest(request)

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
