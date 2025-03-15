import type { Context, Router } from '@orpc/server'
import type { FetchHandler, FetchHandleResult } from '@orpc/server/fetch'
import type { StandardHandleOptions } from '@orpc/server/standard'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { ToFetchResponseOptions } from '@orpc/standard-server-fetch'
import type { StandardOpenAPIHandlerOptions } from '../standard'
import { StandardBracketNotationSerializer, StandardOpenAPIJsonSerializer, StandardOpenAPISerializer } from '@orpc/openapi-client/standard'
import { StandardHandler } from '@orpc/server/standard'
import { toFetchResponse, toStandardLazyRequest } from '@orpc/standard-server-fetch'
import { StandardOpenAPICodec, StandardOpenAPIMatcher } from '../standard'

export class OpenAPIHandler<T extends Context> implements FetchHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<any, T>, options: NoInfer<StandardOpenAPIHandlerOptions<T>> = {}) {
    const jsonSerializer = new StandardOpenAPIJsonSerializer(options)
    const bracketNotationSerializer = new StandardBracketNotationSerializer()
    const serializer = new StandardOpenAPISerializer(jsonSerializer, bracketNotationSerializer)
    const matcher = new StandardOpenAPIMatcher()
    const codec = new StandardOpenAPICodec(serializer)

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
