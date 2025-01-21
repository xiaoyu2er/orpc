import type { ErrorMap } from './error-map'
import type { Meta } from './meta'
import type { ContractProcedure } from './procedure'

export type ContractRouter<TErrorMap extends ErrorMap, TMetaDef extends Meta> =
  | ContractProcedure<any, any, TErrorMap, any, TMetaDef, any>
  | {
    [k: string]: ContractRouter<TErrorMap, TMetaDef>
  }

export type AnyContractRouter = ContractRouter<any, any>
