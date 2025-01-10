import { isDefinedError } from '@orpc/contract'
import { useInfiniteQuery, useMutation, useQueries, useQuery } from '@tanstack/vue-query'
import { ref } from 'vue'
import { orpc, queryClient } from './helpers'

beforeEach(() => {
  queryClient.clear()
  vi.clearAllMocks()
})

describe('useQuery', () => {
  it('on success', async () => {
    const id = ref('123')

    const query = useQuery(orpc.post.find.queryOptions({ input: { id } }), queryClient)

    expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.find.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.find.key({ input: { id: '123' } }) })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.key({ type: 'mutation' }) })).toEqual(0)

    await vi.waitFor(() => expect(query.data.value).toEqual({ id: '123', title: 'title-123' }))

    expect(queryClient.getQueryData(orpc.post.find.key({ input: { id: '123' }, type: 'query' })))
      .toEqual({ id: '123', title: 'title-123' })

    id.value = '456'

    await vi.waitFor(() => expect(query.data.value).toEqual({ id: '456', title: 'title-456' }))
  })

  it('on error', async () => {
    const query = useQuery(orpc.post.find.queryOptions({ input: { id: 'NOT_FOUND' } }), queryClient)

    await vi.waitFor(
      () => expect(query.error.value).toSatisfy((e: any) => isDefinedError(e) && e.code === 'NOT_FOUND'),
    )
  })

  it('with client context', async () => {
    const query = useQuery(orpc.post.find.queryOptions({ input: { id: '123' }, context: { cache: 'force' } }), queryClient)

    await vi.waitFor(
      () => expect(query.error.value).toSatisfy((e: any) => e.message === 'cache=force is not supported'),
    )
  })
})

describe('useInfiniteQuery', () => {
  it('on success', async () => {
    const keyword = ref('hi')

    const query = useInfiniteQuery(orpc.post.list.infiniteOptions({
      input: { keyword },
      getNextPageParam: lastPage => lastPage.nextCursor,
    }), queryClient)

    expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.list.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.list.key({ input: { keyword: 'hi' }, type: 'infinite' }) })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.key({ type: 'mutation' }) })).toEqual(0)

    await vi.waitFor(() => {
      expect(query.data.value?.pages.length).toEqual(1)
      expect(query.data.value?.pages[0]!.items).toEqual([{ id: 'id-0', title: 'title-0' }])
    })

    query.fetchNextPage()

    await vi.waitFor(() => expect(query.data.value?.pages.length).toEqual(2))

    keyword.value = 'bye'

    await vi.waitFor(() => expect(query.data.value?.pages.length).toEqual(1))
  })

  it('on error', async () => {
    const query = useInfiniteQuery(orpc.post.list.infiniteOptions({
      input: { keyword: 'TOO_MANY_REQUESTS' },
      getNextPageParam: lastPage => lastPage.nextCursor,
    }), queryClient)

    await vi.waitFor(
      () => expect(query.error.value).toSatisfy((e: any) => isDefinedError(e) && e.code === 'TOO_MANY_REQUESTS'),
    )
  })

  it('with client context', async () => {
    const query = useInfiniteQuery(orpc.post.list.infiniteOptions({
      input: {},
      context: { cache: 'force' },
      getNextPageParam: lastPage => lastPage.nextCursor,
    }), queryClient)

    await vi.waitFor(
      () => expect(query.error.value).toSatisfy((e: any) => e.message === 'cache=force is not supported'),
    )
  })
})

describe('useMutation', () => {
  it('on success', async () => {
    const mutation = useMutation(orpc.post.create.mutationOptions(), queryClient)

    mutation.mutate({ title: 'title', thumbnail: new File(['hello'], 'hello.txt') })

    expect(queryClient.isMutating({ mutationKey: orpc.key() })).toEqual(1)
    expect(queryClient.isMutating({ mutationKey: orpc.post.key() })).toEqual(1)
    expect(queryClient.isMutating({ mutationKey: orpc.post.create.key({ type: 'mutation' }) })).toEqual(1)

    expect(queryClient.isMutating({ mutationKey: orpc.post.list.key() })).toEqual(0)
    expect(queryClient.isMutating({ mutationKey: orpc.post.key({ type: 'query' }) })).toEqual(0)

    await vi.waitFor(
      () => expect(mutation.data.value).toEqual({ id: 'id-title', title: 'title', thumbnail: 'hello.txt' }),
    )
  })

  it('on error', async () => {
    const mutation = useMutation(orpc.post.create.mutationOptions(), queryClient)

    mutation.mutate({ title: 'CONFLICT' })

    await vi.waitFor(
      () => expect(mutation.error.value).toSatisfy((e: any) => isDefinedError(e) && e.code === 'CONFLICT'),
    )
  })

  it('with client context', async () => {
    const mutation = useMutation(orpc.post.create.mutationOptions({
      context: { cache: 'force' },
    }), queryClient)

    mutation.mutate({ title: 'CONFLICT' })

    await vi.waitFor(
      () => expect(mutation.error.value).toSatisfy((e: any) => e.message === 'cache=force is not supported'),
    )
  })
})

describe('other hooks', () => {
  it('useQueries', async () => {
    const id = ref('123')

    const query = useQueries({
      queries: [
        orpc.post.find.queryOptions({
          input: { id },
        }),
        orpc.post.list.queryOptions({
          input: {},
        }),
      ],
    }, queryClient)

    expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(2)
    expect(queryClient.isFetching({ queryKey: orpc.post.key() })).toEqual(2)
    expect(queryClient.isFetching({ queryKey: orpc.post.find.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.list.key() })).toEqual(1)

    expect(queryClient.isFetching({ queryKey: orpc.post.create.key() })).toEqual(0)
    expect(queryClient.isFetching({ queryKey: orpc.post.key({ type: 'mutation' }) })).toEqual(0)

    await vi.waitFor(() => expect(query.value[0].data).toEqual({ id: '123', title: 'title-123' }))
    await vi.waitFor(() => expect(query.value[1].data).toEqual({ nextCursor: 1, items: [{ id: 'id-0', title: 'title-0' }] }))

    id.value = '456'

    await vi.waitFor(() => expect(query.value[0].data).toEqual({ id: '456', title: 'title-456' }))
  })
})
