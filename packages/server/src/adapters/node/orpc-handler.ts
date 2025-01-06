import type { ServerResponse } from 'node:http'
import type { Router } from '../../router'
import type { Context } from '../../types'
import type { ORPCHandlerOptions } from '../fetch/orpc-handler'
import type { RequestHandler, RequestHandleRest, RequestHandleResult } from './types'
import { ORPCHandler as ORPCFetchHandler } from '../fetch/orpc-handler'
import { createRequest, type ExpressableIncomingMessage, sendResponse } from './request-listener'

export class ORPCHandler<T extends Context> implements RequestHandler<T> {
  private readonly orpcFetchHandler: ORPCFetchHandler<T>

  constructor(router: Router<T, any>, options?: NoInfer<ORPCHandlerOptions<T>>) {
    this.orpcFetchHandler = new ORPCFetchHandler(router, options)
  }

  async handle(req: ExpressableIncomingMessage, res: ServerResponse, ...[options]: RequestHandleRest<T>): Promise<RequestHandleResult> {
    const request = createRequest(req, res)

    const castedOptions = (options ?? {}) as Exclude<typeof options, undefined>

    const result = await this.orpcFetchHandler.handle(request, castedOptions)

    if (result.matched === false) {
      return { matched: false }
    }

    await options?.beforeSend?.(result.response, castedOptions.context as T)

    await sendResponse(res, result.response)

    return { matched: true }
  }
}
