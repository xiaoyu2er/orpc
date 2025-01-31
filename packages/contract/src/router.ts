import type { Meta } from './meta'
import type { SchemaInput, SchemaOutput } from './schema'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap } from './error-map'
import { ContractProcedure, isContractProcedure } from './procedure'
import { adaptRoute, type HTTPPath } from './route'

export type ContractRouter<TMeta extends Meta> =
  | ContractProcedure<any, any, any, TMeta>
  | {
    [k: string]: ContractRouter<TMeta>
  }

export type AnyContractRouter = ContractRouter<any>

export type AdaptedContractRouter<
  TContract extends AnyContractRouter,
  TErrorMap extends ErrorMap,
> = {
  [K in keyof TContract]: TContract[K] extends
  ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrors, infer UMeta>
    ? ContractProcedure<UInputSchema, UOutputSchema, MergedErrorMap<TErrorMap, UErrors>, UMeta>
    : TContract[K] extends AnyContractRouter
      ? AdaptedContractRouter<TContract[K], TErrorMap>
      : never
}

export interface AdaptContractRouterOptions<TErrorMap extends ErrorMap> {
  errorMap: TErrorMap
  prefix?: HTTPPath
  tags?: readonly string[]
}

export function adaptContractRouter<TRouter extends ContractRouter<any>, TErrorMap extends ErrorMap>(
  contract: TRouter,
  options: AdaptContractRouterOptions<TErrorMap>,
): AdaptedContractRouter<TRouter, TErrorMap> {
  if (isContractProcedure(contract)) {
    const adapted = new ContractProcedure({
      ...contract['~orpc'],
      errorMap: mergeErrorMap(options.errorMap, contract['~orpc'].errorMap),
      route: adaptRoute(contract['~orpc'].route, options),
    })

    return adapted as any
  }

  const adapted: Record<string, any> = {}

  for (const key in contract) {
    adapted[key] = adaptContractRouter(contract[key]!, options)
  }

  return adapted as any
}

export type InferContractRouterInputs<T extends AnyContractRouter> =
  T extends ContractProcedure<infer UInputSchema, any, any, any>
    ? SchemaInput<UInputSchema>
    : {
        [K in keyof T]: T[K] extends AnyContractRouter ? InferContractRouterInputs<T[K]> : never
      }

export type InferContractRouterOutputs<T extends AnyContractRouter> =
  T extends ContractProcedure<any, infer UOutputSchema, any, any>
    ? SchemaOutput<UOutputSchema>
    : {
        [K in keyof T]: T[K] extends AnyContractRouter ? InferContractRouterOutputs<T[K]> : never
      }

export type ContractRouterToErrorMap<T extends AnyContractRouter> =
  T extends ContractProcedure<any, any, infer UErrorMap, any> ? UErrorMap :
      {
        [K in keyof T]: T[K] extends AnyContractRouter ? ContractRouterToErrorMap<T[K]> : never
      }[keyof T]

export type ContractRouterToMeta<T extends AnyContractRouter> =
  T extends ContractRouter<infer UMeta> ? UMeta : never
