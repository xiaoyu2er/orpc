import { createRouterClient } from '@orpc/server'
import { router } from '../router/index'
import { getHeaders } from '@tanstack/react-start/server'
import { createIsomorphicFn } from '@tanstack/react-start'

/**
 * This is part of the Optimize SSR setup.
 *
 * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-start#optimize-ssr}
 */
export const setupORPCServerClient = createIsomorphicFn()
  .server(() => {
    globalThis.$client = createRouterClient(router, {
      /**
       * Provide initial context if needed.
       *
       * Because this client instance is shared across all requests,
       * only include context that's safe to reuse globally.
       * For per-request context, use middleware context or pass a function as the initial context.
       */
      context: async () => ({
        headers: getHeaders(),
      }),
    })
  })
  .client(() => {})
