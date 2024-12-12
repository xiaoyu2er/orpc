import { useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/vue-query'
import { orpc } from '../lib/orpc'

const query = useQuery(orpc.planet.find.queryOptions({
  input: { id: 1 },
}))

const infinite = useInfiniteQuery(orpc.planet.list.infiniteOptions({
  input: {},
  getNextPageParam: lastPage => (lastPage.at(-1)?.id ?? -1) + 1,
}))

const queryClient = useQueryClient()

const mutation = useMutation(orpc.planet.create.mutationOptions({
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: orpc.planet.list.key(),
    })
  },
}))

const queries = useQueries({
  queries: [
    orpc.planet.find.queryOptions({ input: { id: 1 } }),
    orpc.planet.list.queryOptions({ input: {} }),
  ],
})
