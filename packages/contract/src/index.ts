/** unnoq */

import { ContractBuilder } from './builder'
import { createStrictRoute } from './route-utils'

export * from './builder'
export * from './builder-with-errors'
export * from './client'
export * from './client-utils'
export * from './config'
export * from './error'
export * from './error-map'
export * from './error-orpc'
export * from './error-utils'
export * from './meta'
export * from './meta-utils'
export * from './procedure'
export * from './procedure-builder'
export * from './procedure-builder-with-input'
export * from './procedure-builder-with-output'
export * from './procedure-client'
export * from './procedure-decorated'
export * from './route'
export * from './route-utils'
export * from './router'
export * from './router-builder'
export * from './router-client'
export * from './router-utils'
export * from './schema'
export * from './schema-utils'
export * from './types'

export const oc = new ContractBuilder({
  route: createStrictRoute({}), // strict is important for contract-first
  errorMap: {},
  inputSchema: undefined,
  outputSchema: undefined,
  meta: {},
})
