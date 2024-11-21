import { Builder } from './builder'

export * from './builder'
export * from './middleware'
export * from './procedure'
export * from './procedure-builder'
export * from './procedure-caller'
export * from './procedure-implementer'
export * from './router'
export * from './router-caller'
export * from './router-implementer'
export * from './types'
export * from './utils'
export * from '@orpc/shared/error'

export const os = new Builder<undefined | Record<string, unknown>, undefined>()
