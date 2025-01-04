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

  async handle<UReturnFalseOnNoMatch extends boolean = false>(
    req: IncomingMessage,
    res: ServerResponse,
    ...[options]: [options: RequestOptions<T, UReturnFalseOnNoMatch>] | (undefined extends T ? [] : never)
  ): Promise<void | (true extends UReturnFalseOnNoMatch ? false : never)> {
    const request = createRequest(req, res, options)

    const castedOptions = (options ?? {}) as Exclude<typeof options, undefined>

    const response = await this.orpcFetchHandler.fetch(request, castedOptions)

    if (response === false) {
      return false as any
    }

    await options?.beforeSend?.(response, castedOptions.context as T)

    return await sendResponse(res, response)
  }
}
