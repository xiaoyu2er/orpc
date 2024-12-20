import type { router } from '@/app/api/[...rest]/router'
import { createORPCFetchClient } from '@orpc/client'
import { createORPCReact } from '@orpc/react'

export const orpcClient = createORPCFetchClient<typeof router>({
  baseURL: 'http://localhost:3000/api',
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const { orpc, ORPCContext } = createORPCReact<typeof orpcClient>()
