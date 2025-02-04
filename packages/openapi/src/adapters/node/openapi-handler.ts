import type { Context, Router } from '@orpc/server'
import type { NodeHttpHandler, NodeHttpHandleResult, NodeHttpRequest, NodeHttpResponse } from '@orpc/server/node'
import type { StandardHandleRest, StandardHandlerOptions } from '@orpc/server/standard'
import type { SetOptional } from '@orpc/shared'
import { nodeHttpResponseSendStandardResponse, nodeHttpToStandardRequest } from '@orpc/server/node'
import { StandardHandler } from '@orpc/server/standard'
import { OpenAPICodec, type OpenAPICodecOptions, OpenAPIMatcher, type OpenAPIMatcherOptions } from '../standard'

export interface OpenAPIHandlerOptions<T extends Context>
  extends SetOptional<StandardHandlerOptions<T>, 'codec' | 'matcher'>, OpenAPIMatcherOptions, OpenAPICodecOptions {
}

export class OpenAPIHandler<T extends Context> implements NodeHttpHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<T, any>, options?: NoInfer<OpenAPIHandlerOptions<T>>) {
    const matcher = options?.matcher ?? new OpenAPIMatcher(options)
    const codec = options?.codec ?? new OpenAPICodec(options)
    this.standardHandler = new StandardHandler(router, { ...options, codec, matcher })
  }

  async handle(req: NodeHttpRequest, res: NodeHttpResponse, ...rest: StandardHandleRest<T>): Promise<NodeHttpHandleResult> {
    const standardRequest = nodeHttpToStandardRequest(req, res)

    const result = await this.standardHandler.handle(standardRequest, ...rest)

    if (!result.matched) {
      return { matched: false }
    }

    await nodeHttpResponseSendStandardResponse(res, result.response)

    return { matched: true }
  }
}
