import type { Params } from 'hono/router'

export class InputBuilderFull {
  build(params: Params, query: unknown, headers: unknown, body: unknown): { params: Params, query: unknown, headers: unknown, body: unknown } {
    return {
      params,
      query,
      headers,
      body,
    }
  }
}

export type PublicInputBuilderFull = Pick<InputBuilderFull, keyof InputBuilderFull>
