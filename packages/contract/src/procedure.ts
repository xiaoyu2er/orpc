import type { ErrorMap } from './error-map'
import type { HTTPMethod, HTTPPath, InputStructure, OutputStructure, Schema, SchemaOutput } from './types'

export interface RouteOptions {
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

export interface ContractProcedureDef<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> {
  route?: RouteOptions
  InputSchema: TInputSchema
  inputExample?: SchemaOutput<TInputSchema>
  OutputSchema: TOutputSchema
  outputExample?: SchemaOutput<TOutputSchema>
  errorMap: TErrorMap
}

export class ContractProcedure<TInputSchema extends Schema, TOutputSchema extends Schema, TErrorMap extends ErrorMap> {
  '~type' = 'ContractProcedure' as const
  '~orpc': ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap>

  constructor(def: ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap>) {
    if (def.route?.successStatus && (def.route.successStatus < 200 || def.route?.successStatus > 299)) {
      throw new Error('[ContractProcedure] The successStatus must be between 200 and 299')
    }

    if (Object.values(def.errorMap ?? {}).some(val => val && val.status && (val.status < 400 || val.status > 599))) {
      throw new Error('[ContractProcedure] The error status code must be in the 400-599 range.')
    }

    this['~orpc'] = def
  }
}

export type ANY_CONTRACT_PROCEDURE = ContractProcedure<any, any, any>
export type WELL_CONTRACT_PROCEDURE = ContractProcedure<Schema, Schema, ErrorMap>

export function isContractProcedure(item: unknown): item is ANY_CONTRACT_PROCEDURE {
  if (item instanceof ContractProcedure) {
    return true
  }

  return (
    (typeof item === 'object' || typeof item === 'function')
    && item !== null
    && '~type' in item
    && item['~type'] === 'ContractProcedure'
    && '~orpc' in item
    && typeof item['~orpc'] === 'object'
    && item['~orpc'] !== null
    && 'InputSchema' in item['~orpc']
    && 'OutputSchema' in item['~orpc']
    && 'errorMap' in item['~orpc']
  )
}
