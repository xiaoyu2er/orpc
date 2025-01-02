import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Router } from '../../router'
import type { Context } from '../../types'
import type { ORPCHandlerOptions } from '../fetch/orpc-handler'
import type { ConditionalRequestHandler, RequestOptions } from './types'
import { createRequest, sendResponse } from '@mjackson/node-fetch-server'
import { ORPC_HANDLER_HEADER, ORPC_HANDLER_VALUE } from '@orpc/shared'
import { ORPCHandler as ORPCFetchHandler } from '../fetch/orpc-handler'

export class ORPCHandler<T extends Context> implements ConditionalRequestHandler<T> {
  private readonly orpcFetchHandler: ORPCFetchHandler<T>

  constructor(router: Router<T, any>, options?: NoInfer<ORPCHandlerOptions<T>>) {
    this.orpcFetchHandler = new ORPCFetchHandler(router, options)
  }

  condition(request: IncomingMessage): boolean {
    return Boolean(request.headers[ORPC_HANDLER_HEADER]?.includes(ORPC_HANDLER_VALUE))
  }

  async handle(req: IncomingMessage, res: ServerResponse, ...[options]: [options: RequestOptions<T>] | (undefined extends T ? [] : never)): Promise<void> {
    const request = createRequest(req, res, options)

    const response = await this.orpcFetchHandler.fetch(request, (options ?? {}) as Exclude<typeof options, undefined>)

    await options?.beforeSend?.(req, res)

    return await sendResponse(res, response)
  }
}
