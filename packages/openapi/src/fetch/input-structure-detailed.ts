import type { Params } from 'hono/router'

export class InputStructureDetailed {
  build(params: Params, query: unknown, headers: unknown, body: unknown): { params: Params, query: unknown, headers: unknown, body: unknown } {
    return {
      params,
      query,
      headers,
      body,
    }
  }
}

export type PublicInputStructureDetailed = Pick<InputStructureDetailed, keyof InputStructureDetailed>
