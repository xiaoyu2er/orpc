import type { ORPCError } from '@orpc/contract'
import { useInfiniteQuery, useMutation, useQueries, useQuery, useSuspenseInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query'
import { orpc } from './helpers'

describe('useQuery', () => {
  it('infer input', async () => {
    useQuery(orpc.post.find.queryOptions({
      input: { id: '123' },
    }))

    // @ts-expect-error --- input is required
    useQuery(orpc.post.find.queryOptions({
    }))

    useQuery(orpc.post.find.queryOptions({
      // @ts-expect-error --- input is invalid
      input: { id: 123 },
    }))
  })

  it('infer output', () => {
    const query = useQuery(orpc.post.find.queryOptions({
      input: { id: '123' },
      select(data) {
        expectTypeOf(data).toEqualTypeOf<{ id: string, title: string, thumbnail?: string }>()

        return 'new-output' as const
      },
    }))

    expectTypeOf(query.data).toEqualTypeOf<'new-output' | undefined>()
  })

  it('infer errors', () => {
    const query = useQuery(orpc.post.find.queryOptions({
      input: { id: '123' },
      throwOnError(error) {
        expectTypeOf(error).toEqualTypeOf<Error | ORPCError<'NOT_FOUND', { id: string }>>()

        return false
      },
    }))

    expectTypeOf(query.error).toEqualTypeOf<Error | ORPCError<'NOT_FOUND', { id: string }> | null>()
  })

  it('infer client context', () => {
    useQuery(orpc.post.find.queryOptions({
      input: { id: '123' },
      context: { cache: 'force' },
    }))

    useQuery(orpc.post.find.queryOptions({
      input: { id: '123' },
      // @ts-expect-error --- invalid context
      context: { cache: 123 },
    }))
  })
})

describe('useInfiniteQuery', () => {
  it('infer input', async () => {
    useInfiniteQuery(orpc.post.list.infiniteOptions({
      input: { keyword: 'keyword' },
      getNextPageParam: () => 2,
    }))

    // @ts-expect-error --- invalid input
    useInfiniteQuery(orpc.post.list.infiniteOptions({
      // @ts-expect-error --- invalid input
      input: { keyword: 1234 },
      getNextPageParam: () => 2,
    }))
  })

  it('infer output', async () => {
    const query = useInfiniteQuery(orpc.post.list.infiniteOptions({
      input: { keyword: 'keyword' },
      getNextPageParam: () => 2,
      select(data) {
        expectTypeOf(data.pages[0]!.items).toEqualTypeOf<{ id: string, title: string, thumbnail?: string }[]>()

        return 'new-output' as const
      },
    }))

    expectTypeOf(query.data).toEqualTypeOf<'new-output' | undefined>()
  })

  it('infer errors', async () => {
    const query = useInfiniteQuery(orpc.post.list.infiniteOptions({
      input: { keyword: 'keyword' },
      getNextPageParam: () => 2,
      throwOnError(error) {
        expectTypeOf(error).toEqualTypeOf<Error | ORPCError<'TOO_MANY_REQUESTS', { keyword?: string, cursor: number }>>()

        return false
      },
    }))

    expectTypeOf(query.error).toEqualTypeOf<null | Error | ORPCError<'TOO_MANY_REQUESTS', { keyword?: string, cursor: number }>>()
  })

  it('infer client context', () => {
    useInfiniteQuery(orpc.post.list.infiniteOptions({
      input: { keyword: 'keyword' },
      getNextPageParam: () => 2,
      context: { cache: '1234' },
    }))

    // @ts-expect-error --- invalid context
    useInfiniteQuery(orpc.post.list.infiniteOptions({
      input: { keyword: 'keyword' },
      getNextPageParam: () => 2,
      // @ts-expect-error --- invalid context
      context: { cache: 1234 },
    }))
  })
})

describe('useMutation', () => {
  it('infer input', async () => {
    const mutation = useMutation(orpc.post.create.mutationOptions({
      onMutate(input) {
        expectTypeOf(input).toEqualTypeOf<{ title: string, thumbnail?: File }>()
      },
    }))

    mutation.mutate({ title: 'title' })
    mutation.mutate({ title: 'title', thumbnail: new File([], 'thumbnail.png') })

    // @ts-expect-error --- invalid input
    mutation.mutate({ title: 123 })
    // @ts-expect-error --- invalid input
    mutation.mutate({ title: 'title', thumbnail: 124 })
  })

  it('infer output', async () => {
    const mutation = useMutation(orpc.post.create.mutationOptions({
      onSuccess(data) {
        expectTypeOf(data).toEqualTypeOf<{ id: string, title: string, thumbnail?: string }>()
      },
    }))

    expectTypeOf(await mutation.mutateAsync({ title: '123' })).toEqualTypeOf<{ id: string, title: string, thumbnail?: string }>()
  })

  it('infer errors', () => {
    const mutation = useMutation(orpc.post.create.mutationOptions({
      onError(error) {
        expectTypeOf(error).toEqualTypeOf<
          | Error
          | ORPCError<'CONFLICT', { title: string, thumbnail?: File }>
          | ORPCError<'FORBIDDEN', { title: string, thumbnail?: File }>
        >()
      },
    }))

    expectTypeOf(mutation.error).toEqualTypeOf<
      | null
      | Error
      | ORPCError<'CONFLICT', { title: string, thumbnail?: File }>
      | ORPCError<'FORBIDDEN', { title: string, thumbnail?: File }>
    >()
  })

  it('infer client context', () => {
    useMutation(orpc.post.create.mutationOptions({
      context: { cache: '1234' },
    }))

    // @ts-expect-error --- invalid context
    useMutation(orpc.post.create.mutationOptions({
      context: { cache: 1234 },
    }))
  })
})

describe('other hooks', () => {
  it('useSuspenseQuery', async () => {
    const query = useSuspenseQuery(orpc.post.find.queryOptions({
      input: { id: '123' },
      context: { cache: '123' },
    }))

    expectTypeOf(query.data).toEqualTypeOf<{ id: string, title: string, thumbnail?: string }>()
    expectTypeOf(query.error).toEqualTypeOf<Error | ORPCError<'NOT_FOUND', { id: string }> | null>()
  })

  it('useSuspenseInfiniteQuery', async () => {
    const query = useSuspenseInfiniteQuery(orpc.post.list.infiniteOptions({
      input: { keyword: 'keyword' },
      context: { cache: '123' },
      getNextPageParam: () => 2,
    }))

    expectTypeOf(query.data.pages[0]!).toEqualTypeOf<{ nextCursor: number, items: { id: string, title: string, thumbnail?: string }[] }>()
    expectTypeOf(query.error).toEqualTypeOf<null | Error | ORPCError<'TOO_MANY_REQUESTS', { keyword?: string, cursor: number }>>()
  })

  it('useQueries', async () => {
    const queries = useQueries({
      queries: [
        orpc.post.find.queryOptions({
          input: { id: '123' },
          context: { cache: '123' },
          // FIXME: cannot use select inside useQueries
          // select(data) {
          //   expectTypeOf(data).toEqualTypeOf<{ id: string, title: string, thumbnail?: string }>()
          // },
        }),
        orpc.post.list.queryOptions({
          input: { },
          context: { cache: '123' },
        }),
      ],
    })

    expectTypeOf(queries[0].data).toEqualTypeOf<undefined | { id: string, title: string, thumbnail?: string }>()
    expectTypeOf(queries[1].data).toEqualTypeOf<undefined | { nextCursor: number, items: { id: string, title: string, thumbnail?: string }[] }>()

    // FIXME: useQueries cannot infer error
    //   expectTypeOf(queries[0].error).toEqualTypeOf<Error | ORPCError<'NOT_FOUND', { id: string }> | null>()
    //   expectTypeOf(queries[0].error).toEqualTypeOf<null | Error | ORPCError<'TOO_MANY_REQUESTS', { keyword?: string, cursor: number }>>()
  })
})
