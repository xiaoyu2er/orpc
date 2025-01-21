/** unnoq */

import { ContractBuilder } from './builder'
import { createStrictRoute } from './route'

export * from './builder'
export * from './client'
export * from './client-utils'
export * from './config'
export * from './error'
export * from './error-map'
export * from './error-orpc'
export * from './procedure'
export * from './procedure-builder'
export * from './procedure-builder-with-input'
export * from './procedure-builder-with-output'
export * from './procedure-client'
export * from './procedure-decorated'
export * from './route'
export * from './router'
export * from './router-builder'
export * from './router-client'
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
