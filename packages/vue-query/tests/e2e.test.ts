import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/vue-query'
import { orpc, queryClient } from './helpers'

beforeEach(() => {
  queryClient.clear()
})

describe('useQuery', () => {
  it('works - onSuccess', async () => {
    const query = useQuery(orpc.ping.queryOptions(), queryClient)

    expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.ping.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.ping.key({ type: 'mutation' }) })).toEqual(0)

    await vi.waitFor(() => expect(query.data.value).toEqual('pong'))

    expect(queryClient.getQueryData(orpc.ping.key({ type: 'query' }))).toEqual('pong')
  })

  it('works - onError', async () => {
    // @ts-expect-error -- invalid input
    const query = useQuery(orpc.user.create.queryOptions({ input: {} }), queryClient)

    await vi.waitFor(() => expect(query.error.value).toEqual(new Error('Validation input failed')))

    expect(queryClient.getQueryData(orpc.ping.key({ type: 'query' }))).toEqual(undefined)
  })
})

describe('useInfiniteQuery', () => {
  it('works - onSuccess', async () => {
    const query = useInfiniteQuery(orpc.user.list.infiniteOptions({
      input: {},
      getNextPageParam: lastPage => lastPage.nextCursor,
    }), queryClient)

    await vi.waitFor(() => expect(query.data.value?.pages.length).toEqual(1))

    query.fetchNextPage()

    await vi.waitFor(() => expect(query.data.value?.pages.length).toEqual(2))
  })
})

describe('useMutation', () => {
  it('works - onSuccess', async () => {
    const query = useMutation(orpc.ping.mutationOptions(), queryClient)

    expect(queryClient.isFetching({ queryKey: orpc.ping.key({ type: 'mutation' }) })).toEqual(0)

    query.mutate({})

    expect(queryClient.isMutating({ mutationKey: orpc.ping.key() })).toEqual(1)
    expect(queryClient.isMutating({ mutationKey: orpc.ping.key({ type: 'mutation' }) })).toEqual(1)

    await vi.waitFor(() => expect(query.data.value).toEqual('pong'))
  })
})
