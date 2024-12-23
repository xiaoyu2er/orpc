import type { Promisable } from '@orpc/shared'
import type { Params } from 'hono/router'

export interface OpenApiInputBuilder {
  build: (params: Params, query: URLSearchParams, headers: Headers, body: unknown) => unknown
}

export interface OpenAPITransformer {
  deserialize: (input: unknown) => Promisable<unknown>
  serialize: (output: unknown) => Promisable<unknown>
}
