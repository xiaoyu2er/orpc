/** unnoq */

import { ContractBuilder } from './builder'

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
export * from './types'

export const oc = new ContractBuilder({
  route: {},
  errorMap: {},
  inputSchema: undefined,
  outputSchema: undefined,
  meta: {},
})
