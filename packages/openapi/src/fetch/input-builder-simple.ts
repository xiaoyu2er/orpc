import type { Params } from 'hono/router'
import type { OpenApiInputBuilder } from './types'

export class OpenAPISimpleInputBuilder implements OpenApiInputBuilder {
  build(params: Params, query: URLSearchParams, headers: Headers, body: unknown): unknown {
    return body
  }
}
