import { createORPCClient } from '@orpc/client'
import { createORPCReact } from '@orpc/react'

import type { router } from '@/router'

export const orpcClient = createORPCClient<typeof router>({
  baseURL: 'http://localhost:3000/api',
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const { orpc, ORPCContext } = createORPCReact<typeof router>()
