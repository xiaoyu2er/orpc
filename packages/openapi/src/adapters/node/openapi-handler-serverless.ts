import type { Context, Router } from '@orpc/server'
import type { OpenAPIHandlerOptions } from '../fetch/openapi-handler'
import { LinearRouter } from 'hono/router/linear-router'
import { OpenAPIHandler } from './openapi-handler'

export class OpenAPIServerlessHandler<T extends Context> extends OpenAPIHandler<T> {
  constructor(router: Router<T, any>, options?: NoInfer<OpenAPIHandlerOptions<T>>) {
    super(new LinearRouter(), router, options)
  }
}
