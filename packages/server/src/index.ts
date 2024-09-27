/** dinwwwh */

import { createBuilder } from './builder'

export * from './builder'
export * from './middleware'
export * from './procedure'
export * from './procedure-builder'
export * from './router'
export * from './router-builder'
export * from './types'

export const initORPC = createBuilder<Record<string, never>>()
