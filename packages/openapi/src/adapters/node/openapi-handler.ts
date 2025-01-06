import type { Context, Router } from '@orpc/server'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { OpenAPIHandlerOptions } from '../fetch/openapi-handler'
import type { Hono } from '../fetch/openapi-procedure-matcher'
import { createRequest, type RequestHandler, type RequestHandleRest, type RequestHandleResult, sendResponse } from '@orpc/server/node'
import { OpenAPIHandler as OpenAPIFetchHandler } from '../fetch/openapi-handler'

export class OpenAPIHandler<T extends Context> implements RequestHandler<T> {
  private readonly openapiFetchHandler: OpenAPIFetchHandler<T>

  constructor(hono: Hono, router: Router<T, any>, options?: NoInfer<OpenAPIHandlerOptions<T>>) {
    this.openapiFetchHandler = new OpenAPIFetchHandler(hono, router, options)
  }

  async handle(req: IncomingMessage, res: ServerResponse, ...[options]: RequestHandleRest<T>): Promise<RequestHandleResult> {
    const request = createRequest(req, res)

    const castedOptions = (options ?? {}) as Exclude<typeof options, undefined>

    const result = await this.openapiFetchHandler.handle(request, castedOptions)

    if (result.matched === false) {
      return { matched: false }
    }

    await options?.beforeSend?.(result.response, castedOptions.context as T)

    await sendResponse(res, result.response)

    return { matched: true }
  }
}
