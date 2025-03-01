import type { MaybeOptionalOptions } from '@orpc/shared'
import type { SendStandardResponseOptions } from '@orpc/standard-server-node'
import type { Context } from '../../context'
import type { Router } from '../../router'
import type { RPCHandlerOptions, StandardHandleOptions } from '../standard'
import type { NodeHttpHandler, NodeHttpHandleResult, NodeHttpRequest, NodeHttpResponse } from './types'
import { sendStandardResponse, toStandardRequest } from '@orpc/standard-server-node'
import { RPCCodec, RPCMatcher, StandardHandler } from '../standard'

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
    ...[options]: MaybeOptionalOptions<StandardHandleOptions<T> & SendStandardResponseOptions>
  ): Promise<NodeHttpHandleResult> {
    const standardRequest = toStandardRequest(req, res)

    const result = await this.standardHandler.handle(standardRequest, options as any)

    if (!result.matched) {
      return { matched: false }
    }

    await sendStandardResponse(res, result.response, options)

    return { matched: true }
  }
}
