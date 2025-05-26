import { createRouterUtils } from './router-utils'

export * from './general-utils'
export * from './procedure-utils'
export * from './router-utils'
export * from './types'

export {
  createRouterUtils as createORPCSolidQueryUtils,
}

export type { BuildKeyOptions, OperationType as KeyType } from '@orpc/tanstack-query'
export { buildKey } from '@orpc/tanstack-query'
