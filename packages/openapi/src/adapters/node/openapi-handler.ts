import type { Context, Router } from '@orpc/server'
import type { ConditionalRequestHandler, RequestOptions } from '@orpc/server/node'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { OpenAPIHandlerOptions } from '../fetch/openapi-handler'
import type { Hono } from '../fetch/openapi-procedure-matcher'
import { createRequest, sendResponse } from '@mjackson/node-fetch-server'
import { ORPC_HANDLER_HEADER } from '@orpc/shared'
import { OpenAPIHandler as OpenAPIFetchHandler } from '../fetch/openapi-handler'

export class OpenAPIHandler<T extends Context> implements ConditionalRequestHandler<T> {
  private readonly openapiFetchHandler: OpenAPIFetchHandler<T>

  constructor(hono: Hono, router: Router<T, any>, options?: NoInfer<OpenAPIHandlerOptions<T>>) {
    this.openapiFetchHandler = new OpenAPIFetchHandler(hono, router, options)
  }

  condition(request: IncomingMessage): boolean {
    return request.headers[ORPC_HANDLER_HEADER] === undefined
  }

  async handle(req: IncomingMessage, res: ServerResponse, ...[options]: [options: RequestOptions<T>] | (undefined extends T ? [] : never)): Promise<void> {
    const request = createRequest(req, res, options)

    const castedOptions = (options ?? {}) as Exclude<typeof options, undefined>

    const response = await this.openapiFetchHandler.fetch(request, castedOptions)

    await options?.beforeSend?.(response, castedOptions.context as T)

    return await sendResponse(res, response)
  }
}
