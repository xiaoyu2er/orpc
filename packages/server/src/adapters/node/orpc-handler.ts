import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Router } from '../../router'
import type { Context } from '../../types'
import type { ORPCHandlerOptions } from '../fetch/orpc-handler'
import type { RequestHandler, RequestHandleRest, RequestHandleResult } from './types'
import { createRequest, sendResponse } from '@mjackson/node-fetch-server'
import { ORPCHandler as ORPCFetchHandler } from '../fetch/orpc-handler'

export class ORPCHandler<T extends Context> implements RequestHandler<T> {
  private readonly orpcFetchHandler: ORPCFetchHandler<T>

  constructor(router: Router<T, any>, options?: NoInfer<ORPCHandlerOptions<T>>) {
    this.orpcFetchHandler = new ORPCFetchHandler(router, options)
  }

  async handle(req: IncomingMessage, res: ServerResponse, ...[options]: RequestHandleRest<T>): Promise<RequestHandleResult> {
    const request = createRequest(req, res, options)

    const castedOptions = (options ?? {}) as Exclude<typeof options, undefined>

    const result = await this.orpcFetchHandler.handle(request, castedOptions)

    if (result.matched === false) {
      return { matched: false }
    }

    await options?.beforeSend?.(result.response, castedOptions.context as T)

    void await sendResponse(res, result.response)

    return { matched: true }
  }
}
