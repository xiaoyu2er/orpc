import { QueryClient } from '@tanstack/svelte-query'
import { orpc as client } from '../../client/tests/shared'
import { createORPCSvelteQueryUtils } from '../src'

export const orpc = createORPCSvelteQueryUtils(client)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})
