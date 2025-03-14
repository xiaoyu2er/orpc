import type { MaybeOptionalOptions } from '@orpc/shared'
import type { SendStandardResponseOptions } from '@orpc/standard-server-node'
import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardHandleOptions, StandardRPCHandlerOptions } from '../standard'
import type { NodeHttpHandler, NodeHttpHandleResult, NodeHttpRequest, NodeHttpResponse } from './types'
import { StandardRPCJsonSerializer, StandardRPCSerializer } from '@orpc/client/standard'
import { sendStandardResponse, toStandardLazyRequest } from '@orpc/standard-server-node'
import { StandardHandler, StandardRPCCodec, StandardRPCMatcher } from '../standard'

export class RPCHandler<T extends Context> implements NodeHttpHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<any, T>, options: NoInfer<StandardRPCHandlerOptions<T>> = {}) {
    const jsonSerializer = new StandardRPCJsonSerializer(options)
    const serializer = new StandardRPCSerializer(jsonSerializer)
    const matcher = new StandardRPCMatcher()
    const codec = new StandardRPCCodec(serializer)

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
