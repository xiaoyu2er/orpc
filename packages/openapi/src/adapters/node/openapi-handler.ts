import type { Context, Router } from '@orpc/server'
import type { NodeHttpHandler, NodeHttpHandleResult, NodeHttpRequest, NodeHttpResponse } from '@orpc/server/node'
import type { StandardHandleOptions, StandardHandlerOptions } from '@orpc/server/standard'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { SendStandardResponseOptions } from '@orpc/standard-server-node'
import { OpenAPISerializer } from '@orpc/openapi-client/standard'
import { StandardHandler } from '@orpc/server/standard'
import { sendStandardResponse, toStandardLazyRequest } from '@orpc/standard-server-node'
import { OpenAPICodec, OpenAPIMatcher } from '../standard'

export class OpenAPIHandler<T extends Context> implements NodeHttpHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<any, T>, options: NoInfer<StandardHandlerOptions<T>> = {}) {
    const serializer = new OpenAPISerializer()
    const matcher = new OpenAPIMatcher()
    const codec = new OpenAPICodec(serializer)

    this.standardHandler = new StandardHandler(router, matcher, codec, options)
  }

  async handle(
    req: NodeHttpRequest,
    res: NodeHttpResponse,
    ...[
      options = {} as StandardHandleOptions<T> & SendStandardResponseOptions,
    ]: MaybeOptionalOptions<StandardHandleOptions<T> & SendStandardResponseOptions>
  ): Promise<NodeHttpHandleResult> {
    const standardRequest = toStandardLazyRequest(req, res)

    const result = await this.standardHandler.handle(standardRequest, options)

    if (!result.matched) {
      return { matched: false }
    }

    await sendStandardResponse(res, result.response, options)

    return { matched: true }
  }
}
