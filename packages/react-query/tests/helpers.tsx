import { QueryClient } from '@tanstack/react-query'
import { orpc as client } from '../../client/tests/helpers'
import { createORPCReactQueryUtils } from '../src'

export const orpc = createORPCReactQueryUtils(client)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})
