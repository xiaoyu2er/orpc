/** unnoq */

import { createRouterFetchClient } from './router-fetch-client'

export * from './procedure-fetch-client'
export * from './router-fetch-client'
export * from '@orpc/shared/error'

export const createORPCFetchClient = createRouterFetchClient
