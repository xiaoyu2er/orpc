import type { ErrorMap } from './error-map'
import type { Meta, TypeMeta } from './meta'
import type { Route } from './route'
import type { Schema } from './schema'

export interface ContractProcedureDef<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TRoute extends Route,
  TMetaDef extends Meta,
  TMeta extends TMetaDef,
> {
  __metaDef?: TypeMeta<TMetaDef>
  meta: TMeta
  route: TRoute
  inputSchema: TInputSchema
  outputSchema: TOutputSchema
  errorMap: TErrorMap
}

export class ContractProcedure<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TRoute extends Route,
  TMetaDef extends Meta,
  TMeta extends TMetaDef,
> {
  '~type' = 'ContractProcedure' as const
  '~orpc': ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TRoute, TMetaDef, TMeta>

  constructor(def: ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TRoute, TMetaDef, TMeta>) {
    if (def.route?.successStatus && (def.route.successStatus < 200 || def.route?.successStatus > 299)) {
      throw new Error('[ContractProcedure] The successStatus must be between 200 and 299')
    }

    if (Object.values(def.errorMap).some(val => val && val.status && (val.status < 400 || val.status > 599))) {
      throw new Error('[ContractProcedure] The error status code must be in the 400-599 range.')
    }

    this['~orpc'] = def
  }
}

export type AnyContractProcedure = ContractProcedure<any, any, any, any, any, any>

export function isContractProcedure(item: unknown): item is AnyContractProcedure {
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
    && 'inputSchema' in item['~orpc']
    && 'outputSchema' in item['~orpc']
    && 'errorMap' in item['~orpc']
    && 'route' in item['~orpc']
    && 'meta' in item['~orpc']
  )
}
