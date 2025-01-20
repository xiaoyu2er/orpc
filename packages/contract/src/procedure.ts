import type { ErrorMap } from './error-map'
import type { Route } from './route'
import type { Schema, SchemaOutput } from './types'

export interface ContractProcedureDef<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TRoute extends Route,
> {
  route: TRoute
  InputSchema: TInputSchema
  inputExample?: SchemaOutput<TInputSchema>
  OutputSchema: TOutputSchema
  outputExample?: SchemaOutput<TOutputSchema>
  errorMap: TErrorMap
}

export class ContractProcedure<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TRoute extends Route,
> {
  '~type' = 'ContractProcedure' as const
  '~orpc': ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TRoute>

  constructor(def: ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TRoute>) {
    if (def.route?.successStatus && (def.route.successStatus < 200 || def.route?.successStatus > 299)) {
      throw new Error('[ContractProcedure] The successStatus must be between 200 and 299')
    }

    if (Object.values(def.errorMap).some(val => val && val.status && (val.status < 400 || val.status > 599))) {
      throw new Error('[ContractProcedure] The error status code must be in the 400-599 range.')
    }

    this['~orpc'] = def
  }
}

export type ANY_CONTRACT_PROCEDURE = ContractProcedure<any, any, any, any>
export type WELL_CONTRACT_PROCEDURE = ContractProcedure<Schema, Schema, ErrorMap, Route>

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
    && 'route' in item['~orpc']
  )
}
