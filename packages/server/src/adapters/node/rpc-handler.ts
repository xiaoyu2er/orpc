import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Context } from '../../context'
import type { Router } from '../../router'
import type { RPCHandlerOptions, StandardHandleOptions } from '../standard'
import type { NodeHttpHandler, NodeHttpHandleResult, NodeHttpRequest, NodeHttpResponse } from './types'
import { RPCCodec, RPCMatcher, StandardHandler } from '../standard'
import { nodeHttpResponseSendStandardResponse, nodeHttpToStandardRequest } from './utils'

export class RPCHandler<T extends Context> implements NodeHttpHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<T, any>, options?: NoInfer<RPCHandlerOptions<T>>) {
    const codec = options?.codec ?? new RPCCodec()
    const matcher = options?.matcher ?? new RPCMatcher()

    this.standardHandler = new StandardHandler(router, matcher, codec, options)
  }

  async handle(
    req: NodeHttpRequest,
    res: NodeHttpResponse,
    ...rest: MaybeOptionalOptions<StandardHandleOptions<T>>
  ): Promise<NodeHttpHandleResult> {
    const standardRequest = nodeHttpToStandardRequest(req, res)

    const result = await this.standardHandler.handle(standardRequest, ...rest)

    if (!result.matched) {
      return { matched: false }
    }

    await nodeHttpResponseSendStandardResponse(res, result.response)

    return { matched: true }
  }
}
