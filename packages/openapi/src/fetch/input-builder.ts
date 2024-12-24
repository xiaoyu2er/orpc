import type { Params } from 'hono/router'

export interface OpenApiInputBuilder {
  build: (params: Params, query: URLSearchParams, headers: Headers, body: unknown) => unknown
}
