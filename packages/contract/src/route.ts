import type { HTTPMethod, HTTPPath } from '@orpc/client'

export type InputStructure = 'compact' | 'detailed'
export type OutputStructure = 'compact' | 'detailed'

export interface Route {
  /**
   * The HTTP method of the procedure.
   * This option is typically relevant when integrating with OpenAPI.
   *
   * @see {@link https://orpc.unnoq.com/docs/openapi/routing OpenAPI Routing Docs}
   */
  method?: HTTPMethod

  /**
   * The HTTP path of the procedure.
   * This option is typically relevant when integrating with OpenAPI.
   *
   * @see {@link https://orpc.unnoq.com/docs/openapi/routing OpenAPI Routing Docs}
   */
  path?: HTTPPath

  /**
   * The summary of the procedure.
   * This option is typically relevant when integrating with OpenAPI.
   *
   * @see {@link https://orpc.unnoq.com/docs/openapi/openapi-specification#operation-metadata OpenAPI Operation Metadata Docs}
   */
  summary?: string

  /**
   * The description of the procedure.
   * This option is typically relevant when integrating with OpenAPI.
   *
   * @see {@link https://orpc.unnoq.com/docs/openapi/openapi-specification#operation-metadata OpenAPI Operation Metadata Docs}
   */
  description?: string

  /**
   * Marks the procedure as deprecated.
   * This option is typically relevant when integrating with OpenAPI.
   *
   * @see {@link https://orpc.unnoq.com/docs/openapi/openapi-specification#operation-metadata OpenAPI Operation Metadata Docs}
   */
  deprecated?: boolean

  /**
   * The tags of the procedure.
   * This option is typically relevant when integrating with OpenAPI.
   *
   * @see {@link https://orpc.unnoq.com/docs/openapi/openapi-specification#operation-metadata OpenAPI Operation Metadata Docs}
   */
  tags?: readonly string[]

  /**
   * The status code of the response when the procedure is successful.
   * This option is typically relevant when integrating with OpenAPI.
   *
   * @see {@link https://orpc.unnoq.com/docs/openapi/routing OpenAPI Routing Docs}
   * @default 200
   */
  successStatus?: number

  /**
   * The description of the response when the procedure is successful.
   *  This option is typically relevant when integrating with OpenAPI.
   *
   * @see {@link https://orpc.unnoq.com/docs/openapi/openapi-specification#operation-metadata OpenAPI Operation Metadata Docs}
   * @default 'OK'
   */
  successDescription?: string

  /**
   * Determines how the input should be structured based on `params`, `query`, `headers`, and `body`.
   *
   * @option 'compact'
   * Combines `params` and either `query` or `body` (depending on the HTTP method) into a single object.
   *
   * @option 'detailed'
   * Keeps each part of the request (`params`, `query`, `headers`, and `body`) as separate fields in the input object.
   *
   * Example:
   * ```ts
   * const input = {
   *   params: { id: 1 },
   *   query: { search: 'hello' },
   *   headers: { 'Content-Type': 'application/json' },
   *   body: { name: 'John' },
   * }
   * ```
   *
   * @see {@link https://orpc.unnoq.com/docs/openapi/input-output-structure OpenAPI Input/Output Structure Docs}
   * @default 'compact'
   */
  inputStructure?: InputStructure

  /**
   * Determines how the response should be structured based on the output.
   *
   * @option 'compact'
   * Includes only the body data, encoded directly in the response.
   *
   * @option 'detailed'
   * Separates the output into `headers` and `body` fields.
   * - `headers`: Custom headers to merge with the response headers.
   * - `body`: The response data.
   *
   * Example:
   * ```ts
   * const output = {
   *   headers: { 'x-custom-header': 'value' },
   *   body: { message: 'Hello, world!' },
   * };
   * ```
   *
   * @see {@link https://orpc.unnoq.com/docs/openapi/input-output-structure OpenAPI Input/Output Structure Docs}
   * @default 'compact'
   */
  outputStructure?: OutputStructure
}

export function mergeRoute(a: Route, b: Route): Route {
  return { ...a, ...b }
}

export function prefixRoute(route: Route, prefix: HTTPPath): Route {
  if (!route.path) {
    return route
  }

  return {
    ...route,
    path: `${prefix}${route.path}`,
  }
}
export function unshiftTagRoute(route: Route, tags: readonly string[]): Route {
  return {
    ...route,
    tags: [...tags, ...route.tags ?? []],
  }
}

export function mergePrefix(a: HTTPPath | undefined, b: HTTPPath): HTTPPath {
  return a ? `${a}${b}` : b
}

export function mergeTags(a: readonly string[] | undefined, b: readonly string[]): readonly string[] {
  return a ? [...a, ...b] : b
}

export interface EnhanceRouteOptions {
  prefix?: HTTPPath
  tags?: readonly string[]
}

export function enhanceRoute(route: Route, options: EnhanceRouteOptions): Route {
  let router = route

  if (options.prefix) {
    router = prefixRoute(router, options.prefix)
  }

  if (options.tags?.length) {
    router = unshiftTagRoute(router, options.tags)
  }

  return router
}
