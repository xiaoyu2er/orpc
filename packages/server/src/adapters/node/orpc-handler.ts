import type { ServerResponse } from 'node:http'
import type { Context } from '../../context'
import type { Router } from '../../router'
import type { RPCHandlerOptions } from '../fetch/orpc-handler'
import type { RequestHandler, RequestHandleRest, RequestHandleResult } from './types'
import { RPCHandler as ORPCFetchHandler } from '../fetch/orpc-handler'
import { createRequest, type ExpressableIncomingMessage, sendResponse } from './request-listener'

export class RPCHandler<T extends Context> implements RequestHandler<T> {
  private readonly orpcFetchHandler: ORPCFetchHandler<T>

  constructor(router: Router<T, any>, options?: NoInfer<RPCHandlerOptions<T>>) {
    this.orpcFetchHandler = new ORPCFetchHandler(router, options)
  }

  async handle(req: ExpressableIncomingMessage, res: ServerResponse, ...rest: RequestHandleRest<T>): Promise<RequestHandleResult> {
    const request = createRequest(req, res)

    const result = await this.orpcFetchHandler.handle(request, ...rest)

    if (result.matched === false) {
      return { matched: false }
    }

    const context = rest[0]?.context ?? {} as T

    await rest[0]?.beforeSend?.(result.response, context)

    await sendResponse(res, result.response)

    return { matched: true }
  }
}
