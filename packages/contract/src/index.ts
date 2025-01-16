/** unnoq */

import { ContractBuilder } from './builder'

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
export * from './router'
export * from './router-builder'
export * from './router-client'
export * from './schema-utils'
export * from './types'

export const oc = new ContractBuilder<Record<never, never>>({
  errorMap: {},
  InputSchema: undefined,
  OutputSchema: undefined,
})
