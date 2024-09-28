/** dinwwwh */

import { Builder } from './builder'

export * from './builder'
export * from './middleware'
export * from './procedure'
export * from './procedure-builder'
export * from './procedure-implementer'
export * from './router'
export * from './router-implementer'
export * from './types'

export const initORPC = new Builder<Record<string, never>>()
