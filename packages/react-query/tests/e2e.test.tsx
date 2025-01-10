import { isDefinedError } from '@orpc/contract'
import { useInfiniteQuery, useMutation, useQueries, useQuery, useSuspenseInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { orpc, queryClient } from './helpers'

beforeEach(() => {
  queryClient.clear()
  vi.clearAllMocks()
})

describe('useQuery', () => {
  it('on success', async () => {
    const { result } = renderHook(() => useQuery(orpc.post.find.queryOptions({ input: { id: '123' } }), queryClient))

    expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.find.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.find.key({ input: { id: '123' } }) })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.key({ type: 'mutation' }) })).toEqual(0)

    await vi.waitFor(() => expect(result.current.data).toEqual({ id: '123', title: 'title-123' }))

    expect(queryClient.getQueryData(orpc.post.find.key({ input: { id: '123' }, type: 'query' })))
      .toEqual({ id: '123', title: 'title-123' })
  })

  it('on error', async () => {
    const { result } = renderHook(() => useQuery(orpc.post.find.queryOptions({ input: { id: 'NOT_FOUND' } }), queryClient))

    await vi.waitFor(
      () => expect(result.current.error).toSatisfy((e: any) => isDefinedError(e) && e.code === 'NOT_FOUND'),
    )
  })

  it('with client context', async () => {
    const { result } = renderHook(() => useQuery(orpc.post.find.queryOptions({ input: { id: '123' }, context: { cache: 'force' } }), queryClient))

    await vi.waitFor(
      () => expect(result.current.error).toSatisfy((e: any) => e.message === 'cache=force is not supported'),
    )
  })
})

describe('useInfiniteQuery', () => {
  it('on success', async () => {
    const { result } = renderHook(() => useInfiniteQuery(orpc.post.list.infiniteOptions({
      input: { keyword: 'hi' },
      getNextPageParam: lastPage => lastPage.nextCursor,
    }), queryClient))

    expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.list.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.list.key({ input: { keyword: 'hi' }, type: 'infinite' }) })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.key({ type: 'mutation' }) })).toEqual(0)

    await vi.waitFor(() => {
      expect(result.current.data?.pages.length).toEqual(1)
      expect(result.current.data?.pages[0]!.items).toEqual([{ id: 'id-0', title: 'title-0' }])
    })

    result.current.fetchNextPage()

    await vi.waitFor(() => expect(result.current.data?.pages.length).toEqual(2))
  })

  it('on error', async () => {
    const { result } = renderHook(() => useInfiniteQuery(orpc.post.list.infiniteOptions({
      input: { keyword: 'TOO_MANY_REQUESTS' },
      getNextPageParam: lastPage => lastPage.nextCursor,
    }), queryClient))

    await vi.waitFor(
      () => expect(result.current.error).toSatisfy((e: any) => isDefinedError(e) && e.code === 'TOO_MANY_REQUESTS'),
    )
  })

  it('with client context', async () => {
    const { result } = renderHook(() => useInfiniteQuery(orpc.post.list.infiniteOptions({
      input: { },
      context: { cache: 'force' },
      getNextPageParam: lastPage => lastPage.nextCursor,
    }), queryClient))

    await vi.waitFor(
      () => expect(result.current.error).toSatisfy((e: any) => e.message === 'cache=force is not supported'),
    )
  })
})

describe('useMutation', () => {
  it('on success', async () => {
    const { result } = renderHook(() => useMutation(orpc.post.create.mutationOptions(), queryClient))

    // FIXME: problem with jsdom when upload file
    // result.current.mutate({ title: 'title', thumbnail: new File(['hello'], 'hello.txt') })
    result.current.mutate({ title: 'title' })

    expect(queryClient.isMutating({ mutationKey: orpc.key() })).toEqual(1)
    expect(queryClient.isMutating({ mutationKey: orpc.post.key() })).toEqual(1)
    expect(queryClient.isMutating({ mutationKey: orpc.post.create.key({ type: 'mutation' }) })).toEqual(1)

    expect(queryClient.isMutating({ mutationKey: orpc.post.list.key() })).toEqual(0)
    expect(queryClient.isMutating({ mutationKey: orpc.post.key({ type: 'query' }) })).toEqual(0)

    // FIXME: problem with jsdom when upload file
    // await vi.waitFor(
    //   () => expect(result.current.data).toEqual({ id: 'id-title', title: 'title', thumbnail: 'hello.txt' }),
    // )
    await vi.waitFor(
      () => expect(result.current.data).toEqual({ id: 'id-title', title: 'title' }),
    )
  })

  it('on error', async () => {
    const { result } = renderHook(() => useMutation(orpc.post.create.mutationOptions(), queryClient))

    result.current.mutate({ title: 'CONFLICT' })

    await vi.waitFor(
      () => expect(result.current.error).toSatisfy((e: any) => isDefinedError(e) && e.code === 'CONFLICT'),
    )
  })

  it('with client context', async () => {
    const { result } = renderHook(() => useMutation(orpc.post.create.mutationOptions({
      context: { cache: 'force' },
    }), queryClient))

    result.current.mutate({ title: 'CONFLICT' })

    await vi.waitFor(
      () => expect(result.current.error).toSatisfy((e: any) => e.message === 'cache=force is not supported'),
    )
  })
})

describe('other hooks', () => {
  it('useSuspenseQuery', async () => {
    const { result } = renderHook(() => useSuspenseQuery(orpc.post.find.queryOptions({ input: { id: '123' } }), queryClient))

    expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.find.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.find.key({ input: { id: '123' } }) })).toEqual(1)

    expect(queryClient.isFetching({ queryKey: orpc.post.list.key() })).toEqual(0)
    expect(queryClient.isFetching({ queryKey: orpc.post.key({ type: 'mutation' }) })).toEqual(0)

    await vi.waitFor(() => expect(result.current.data).toEqual({ id: '123', title: 'title-123' }))

    expect(queryClient.getQueryData(orpc.post.find.key({ input: { id: '123' }, type: 'query' })))
      .toEqual({ id: '123', title: 'title-123' })
  })

  it('useSuspenseInfiniteQuery', async () => {
    const { result } = renderHook(() => useSuspenseInfiniteQuery(orpc.post.list.infiniteOptions({
      input: { keyword: 'hi' },
      getNextPageParam: lastPage => lastPage.nextCursor,
    }), queryClient))

    expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.list.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.list.key({ input: { keyword: 'hi' }, type: 'infinite' }) })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.key({ type: 'mutation' }) })).toEqual(0)

    expect(queryClient.isFetching({ queryKey: orpc.post.find.key() })).toEqual(0)
    expect(queryClient.isFetching({ queryKey: orpc.post.key({ type: 'mutation' }) })).toEqual(0)

    await vi.waitFor(() => {
      expect(result.current.data?.pages.length).toEqual(1)
      expect(result.current.data?.pages[0]!.items).toEqual([{ id: 'id-0', title: 'title-0' }])
    })

    result.current.fetchNextPage()

    await vi.waitFor(() => expect(result.current.data?.pages.length).toEqual(2))
  })

  it('useQueries', async () => {
    const { result } = renderHook(() => useQueries({
      queries: [
        orpc.post.find.queryOptions({
          input: { id: '123' },
        }),
        orpc.post.list.queryOptions({
          input: { },
        }),
      ],
    }, queryClient))

    expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(2)
    expect(queryClient.isFetching({ queryKey: orpc.post.key() })).toEqual(2)
    expect(queryClient.isFetching({ queryKey: orpc.post.find.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.post.list.key() })).toEqual(1)

    expect(queryClient.isFetching({ queryKey: orpc.post.create.key() })).toEqual(0)
    expect(queryClient.isFetching({ queryKey: orpc.post.key({ type: 'mutation' }) })).toEqual(0)

    await vi.waitFor(() => expect(result.current[0].data).toEqual({ id: '123', title: 'title-123' }))
    await vi.waitFor(() => expect(result.current[1].data).toEqual({ nextCursor: 1, items: [{ id: 'id-0', title: 'title-0' }] }))
  })
})
