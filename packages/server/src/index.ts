/** dinwwwh */

import { createServerBuilder } from './builder'

export * from './builder'
export * from './middleware'
export * from './route'
export * from './route-builder'
export * from './router'
export * from './router-builder'
export * from './types'

export const initORPCServer = createServerBuilder<Record<string, never>>()
