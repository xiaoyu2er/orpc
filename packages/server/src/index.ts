/** dinwwwh */

import { Builder } from './builder'

export * from './builder'
export * from './error'
export * from './middleware'
export * from './procedure'
export * from './procedure-builder'
export * from './procedure-implementer'
export * from './router'
export * from './router-handler'
export * from './router-implementer'
export * from './types'
export * from './utils'

export const initORPC = new Builder<undefined | Record<string, unknown>, undefined>()
