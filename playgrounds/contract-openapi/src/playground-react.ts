/**
 * This file is where you can play with type of oRPC React.
 */

import { createORPCReactQueryUtils } from '@orpc/react-query'
import { useInfiniteQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { orpc as client } from './playground-client'

const orpc = createORPCReactQueryUtils(client)

const listQuery = useInfiniteQuery(
  orpc.planet.list.infiniteOptions({
    input: {},
    getNextPageParam: lastPage => (lastPage.at(-1)?.id ?? -1) + 1,
  }),
)

const queryClient = useQueryClient()

queryClient.invalidateQueries({
  queryKey: orpc.planet.key(),
})

const queries = useQueries({
  queries: [
    orpc.planet.find.queryOptions({
      input: { id: 1 },
    }),
    orpc.planet.list.queryOptions({
      input: {},
    }),
  ],
})
