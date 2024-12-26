import type { Context, Router } from '@orpc/server'
import type { OpenAPIHandlerOptions } from './openapi-handler'
import { TrieRouter } from 'hono/router/trie-router'
import { OpenAPIHandler } from './openapi-handler'

export class OpenAPIServerHandler<T extends Context> extends OpenAPIHandler<T> {
  constructor(router: Router<T, any>, options?: NoInfer<OpenAPIHandlerOptions<T>>) {
    super(new TrieRouter(), router, options)
  }
}
