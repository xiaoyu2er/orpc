/** unnoq */

import { createRouterClient } from './router'

export * from './procedure'
export * from './router'
export * from '@orpc/shared/error'

export const createORPCClient = createRouterClient
