import type { MaybeOptionalOptions } from '@orpc/shared'
import type { SendStandardResponseOptions } from '@orpc/standard-server-node'
import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardHandleOptions, StandardHandlerOptions } from '../standard'
import type { NodeHttpHandler, NodeHttpHandleResult, NodeHttpRequest, NodeHttpResponse } from './types'
import { RPCSerializer } from '@orpc/client/standard'
import { sendStandardResponse, toStandardLazyRequest } from '@orpc/standard-server-node'
import { RPCCodec, RPCMatcher, StandardHandler } from '../standard'

export class RPCHandler<T extends Context> implements NodeHttpHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<T, any>, options: NoInfer<StandardHandlerOptions<T>> = {}) {
    const serializer = new RPCSerializer()
    const matcher = new RPCMatcher()
    const codec = new RPCCodec(serializer)

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
