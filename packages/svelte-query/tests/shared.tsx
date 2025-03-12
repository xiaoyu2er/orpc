import { QueryClient } from '@tanstack/svelte-query'
import { orpc as client } from '../../client/tests/shared'
import { createORPCSolidQueryUtils } from '../src'

export const orpc = createORPCSolidQueryUtils(client)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})
