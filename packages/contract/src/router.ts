import {
  type ContractProcedure,
  type WELL_DEFINED_CONTRACT_PROCEDURE,
  isContractProcedure,
} from './procedure'

export interface ContractRouter {
  [k: string]: ContractProcedure<any, any> | ContractRouter
}

export function eachContractRouterLeaf(
  router: ContractRouter,
  callback: (item: WELL_DEFINED_CONTRACT_PROCEDURE, path: string[]) => void,
  prefix: string[] = [],
) {
  for (const key in router) {
    const item = router[key]

    if (isContractProcedure(item)) {
      callback(item, [...prefix, key])
    } else {
      eachContractRouterLeaf(item as ContractRouter, callback, [...prefix, key])
    }
  }
}
