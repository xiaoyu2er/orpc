import type { Context, Router } from '@orpc/server'
import type { FetchHandler, FetchHandleResult } from '@orpc/server/fetch'
import type { StandardHandleOptions } from '@orpc/server/standard'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { OpenAPIHandlerOptions } from '../standard'
import { fetchRequestToStandardRequest, standardResponseToFetchResponse } from '@orpc/server/fetch'
import { StandardHandler } from '@orpc/server/standard'
import { OpenAPICodec, OpenAPIMatcher } from '../standard'

export class OpenAPIHandler<T extends Context> implements FetchHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<T, any>, options?: NoInfer<OpenAPIHandlerOptions<T>>) {
    const matcher = options?.matcher ?? new OpenAPIMatcher(options)
    const codec = options?.codec ?? new OpenAPICodec(options)

    this.standardHandler = new StandardHandler(router, matcher, codec, options)
  }

  async handle(request: Request, ...rest: MaybeOptionalOptions<StandardHandleOptions<T>>): Promise<FetchHandleResult> {
    const standardRequest = fetchRequestToStandardRequest(request)

    const result = await this.standardHandler.handle(standardRequest, ...rest)

    if (!result.matched) {
      return result
    }

    return {
      matched: true,
      response: standardResponseToFetchResponse(result.response),
    }
  }
}
