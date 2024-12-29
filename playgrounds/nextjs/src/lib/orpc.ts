import type { router } from '@/app/api/[...rest]/router'
import { createClient } from '@orpc/client'
import { ORPCLink } from '@orpc/client/fetch'
import { createORPCReact } from '@orpc/react'

const orpcLink = new ORPCLink({
  url: 'http://localhost:3000/api',
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const orpcClient = createClient<typeof router>(orpcLink)

export const { orpc, ORPCContext } = createORPCReact<typeof orpcClient>()
