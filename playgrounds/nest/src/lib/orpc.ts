import { createORPCClient } from '@orpc/client'
import { OpenAPILink } from '@orpc/openapi-client/fetch'
import { createORPCReactQueryUtils } from '@orpc/react-query'
import type { ContractRouterClient } from '@orpc/contract'
import { contract } from '../contract'
import { JsonifiedClient } from '@orpc/openapi-client'

const link = new OpenAPILink(contract, {
  url: new URL('/', 'http://localhost:3000'),
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const client: JsonifiedClient<ContractRouterClient<typeof contract>> = createORPCClient(link)

export const orpc = createORPCReactQueryUtils(client)
