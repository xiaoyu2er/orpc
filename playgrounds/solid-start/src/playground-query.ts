import { createInfiniteQuery, createMutation, createQueries, createQuery, useQueryClient } from '@tanstack/solid-query'
import { orpc } from '~/lib/orpc'

const query = createQuery(() => orpc.planet.find.queryOptions({
  input: { id: 1 },
}))

const infinite = createInfiniteQuery(() => orpc.planet.list.infiniteOptions({
  input: cursor => ({ cursor }),
  getNextPageParam: lastPage => (lastPage.at(-1)?.id ?? -1) + 1,
  initialPageParam: 0,
}))

const queryClient = useQueryClient()

const mutation = createMutation(() => orpc.planet.create.mutationOptions({
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: orpc.planet.list.key(),
    })
  },
}))

const queries = createQueries(() => ({
  queries: [
    orpc.planet.find.queryOptions({ input: { id: 1 } }),
    orpc.planet.list.queryOptions({ input: {} }),
  ],
}))
