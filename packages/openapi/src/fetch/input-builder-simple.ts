import type { Params } from 'hono/router'
import type { OpenApiInputBuilder } from './input-builder'

export class OpenAPISimpleInputBuilder implements OpenApiInputBuilder {
  build(params: Params, query: URLSearchParams, headers: Headers, body: unknown): unknown {
    return body
  }
}
