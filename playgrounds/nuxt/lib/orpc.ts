import type { router } from '~/server/router'
import { createClient } from '@orpc/client'
import { ORPCLink } from '@orpc/client/fetch'
import { createORPCVueQueryUtils } from '@orpc/vue-query'

const orpcLink = new ORPCLink({
  url: 'http://localhost:3000/api',
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const client = createClient<typeof router>(orpcLink)

export const orpc = createORPCVueQueryUtils(client)
