import type { Meta } from './meta'
import type { SchemaInput, SchemaOutput } from './schema'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap } from './error-map'
import { ContractProcedure, isContractProcedure } from './procedure'
import { type AdaptedRoute, adaptRoute, type HTTPPath } from './route'

export type ContractRouter<TErrorMap extends ErrorMap, TMetaDef extends Meta> =
  | ContractProcedure<any, any, TErrorMap, any, TMetaDef, any>
  | {
    [k: string]: ContractRouter<TErrorMap, TMetaDef>
  }

export type AnyContractRouter = ContractRouter<any, any>

export type AdaptedContractRouter<
  TContract extends AnyContractRouter,
  TErrorMapExtra extends ErrorMap,
  TPrefix extends HTTPPath | undefined,
  TTags extends readonly string[] | undefined,
> = {
  [K in keyof TContract]: TContract[K] extends
  ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrors, infer URoute, infer UMetaDef, infer UMeta>
    ? ContractProcedure<UInputSchema, UOutputSchema, MergedErrorMap<UErrors, TErrorMapExtra>, AdaptedRoute<URoute, TPrefix, TTags>, UMetaDef, UMeta>
    : TContract[K] extends AnyContractRouter
      ? AdaptedContractRouter<TContract[K], TErrorMapExtra, TPrefix, TTags>
      : never
}

export function adaptContractRouter<
  TContract extends AnyContractRouter,
  TErrorMapExtra extends ErrorMap,
  TPrefix extends HTTPPath | undefined,
  TTags extends readonly string[] | undefined,
>(
  contract: TContract,
  errorMapExtra: TErrorMapExtra,
  prefix: TPrefix,
  tags: TTags,
): AdaptedContractRouter<TContract, TErrorMapExtra, TPrefix, TTags> {
  if (isContractProcedure(contract)) {
    const adapted = new ContractProcedure({
      ...contract['~orpc'],
      errorMap: mergeErrorMap(contract['~orpc'].errorMap, errorMapExtra),
      route: adaptRoute(contract['~orpc'].route, prefix, tags),
    })

    return adapted as any
  }

  const adapted: Record<string, any> = {}

  for (const key in contract) {
    adapted[key] = adaptContractRouter(contract[key]!, errorMapExtra, prefix, tags)
  }

  return adapted as any
}

export type InferContractRouterInputs<T extends AnyContractRouter> =
  T extends ContractProcedure<infer UInputSchema, any, any, any, any, any>
    ? SchemaInput<UInputSchema>
    : {
        [K in keyof T]: T[K] extends AnyContractRouter ? InferContractRouterInputs<T[K]> : never
      }

export type InferContractRouterOutputs<T extends AnyContractRouter> =
  T extends ContractProcedure<any, infer UOutputSchema, any, any, any, any>
    ? SchemaOutput<UOutputSchema>
    : {
        [K in keyof T]: T[K] extends AnyContractRouter ? InferContractRouterOutputs<T[K]> : never
      }
