import type { Params } from 'hono/router'

export class OpenAPIInputFullBuilder {
  build(params: Params, query: unknown, headers: unknown, body: unknown): {
    params: Params
    query: unknown
    headers: unknown
    body: unknown
  } {
    return {
      params,
      query,
      headers,
      body,
    }
  }
}
