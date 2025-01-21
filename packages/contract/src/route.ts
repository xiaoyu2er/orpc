export type HTTPPath = `/${string}`
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
export type InputStructure = 'compact' | 'detailed'
export type OutputStructure = 'compact' | 'detailed'

export interface Route {
  method?: HTTPMethod
  path?: HTTPPath
  summary?: string
  description?: string
  deprecated?: boolean
  tags?: readonly string[]

  /**
   * The status code of the response when the procedure is successful.
   *
   * @default 200
   */
  successStatus?: number

  /**
   * The description of the response when the procedure is successful.
   *
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
   * @default 'compact'
   */
  outputStructure?: OutputStructure
}
