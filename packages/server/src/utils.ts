import type { AnyContractProcedure, HTTPPath } from '@orpc/contract'
import type { AnyProcedure } from './procedure'
import { Procedure } from './procedure'

export function convertPathToHttpPath(path: readonly string[]): HTTPPath {
  return `/${path.map(encodeURIComponent).join('/')}`
}

/**
 * Create a new procedure that ensure the contract is applied to the procedure.
 */
export function createContractedProcedure(contract: AnyContractProcedure, procedure: AnyProcedure): AnyProcedure {
  return new Procedure({
    ...procedure['~orpc'],
    errorMap: contract['~orpc'].errorMap,
    route: contract['~orpc'].route,
    meta: contract['~orpc'].meta,
  })
}
