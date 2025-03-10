import type { ErrorMap } from './error'
import type { Meta } from './meta'
import type { Route } from './route'
import type { AnySchema } from './schema'

export interface ContractProcedureDef<
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  meta: TMeta
  route: Route
  inputSchema?: TInputSchema
  outputSchema?: TOutputSchema
  errorMap: TErrorMap
}

export class ContractProcedure<
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  constructor(def: ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>) {
    if (def.route?.successStatus && (def.route.successStatus < 200 || def.route?.successStatus > 299)) {
      throw new Error('[ContractProcedure] The successStatus must be between 200 and 299')
    }

    if (Object.values(def.errorMap).some(val => val && val.status && (val.status < 400 || val.status > 599))) {
      throw new Error('[ContractProcedure] The error status code must be in the 400-599 range.')
    }

    this['~orpc'] = def
  }
}

export type AnyContractProcedure = ContractProcedure<any, any, any, any>

export function isContractProcedure(item: unknown): item is AnyContractProcedure {
  if (item instanceof ContractProcedure) {
    return true
  }

  return (
    (typeof item === 'object' || typeof item === 'function')
    && item !== null
    && '~orpc' in item
    && typeof item['~orpc'] === 'object'
    && item['~orpc'] !== null
    && 'errorMap' in item['~orpc']
    && 'route' in item['~orpc']
    && 'meta' in item['~orpc']
  )
}
