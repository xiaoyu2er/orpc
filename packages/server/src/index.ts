import { Builder } from './builder'

export * from './builder'
export * from './config'
export * from './context'
export * from './error'
export * from './hidden'
export * from './implementer-chainable'
export * from './lazy'
export * from './lazy-decorated'
export * from './middleware'
export * from './middleware-decorated'
export * from './procedure'
export * from './procedure-builder'
export * from './procedure-client'
export * from './procedure-decorated'
export * from './procedure-implementer'
export * from './procedure-utils'
export * from './router'
export * from './router-builder'
export * from './router-client'
export * from './router-implementer'
export * from './types'

export { isDefinedError, ORPCError, safe, type } from '@orpc/contract'

export const os = new Builder({
  config: {},
})
