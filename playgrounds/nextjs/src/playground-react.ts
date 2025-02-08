/**
 * This file is where you can play with type of oRPC React.
 */

import { orpc } from '@/lib/orpc'
import { useInfiniteQuery, useQueries, useQueryClient } from '@tanstack/react-query'

const listQuery = useInfiniteQuery(
  orpc.planet.list.infiniteOptions({
    input: cursor => ({ cursor }),
    getNextPageParam: lastPage => (lastPage.at(-1)?.id ?? -1) + 1,
    initialPageParam: 0,
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
