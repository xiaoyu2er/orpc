import type { Context, Router } from '@orpc/server'
import type { FetchHandlerOptions } from '@orpc/server/fetch'
import type { StandardOpenAPIHandlerOptions } from '../standard'
import { FetchHandler } from '@orpc/server/fetch'
import { StandardOpenAPIHandler } from '../standard'

export class OpenAPIHandler<T extends Context> extends FetchHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<StandardOpenAPIHandlerOptions<T> & FetchHandlerOptions<T>> = {}) {
    super(new StandardOpenAPIHandler(router, options), options)
  }
}
