import { ORPCError } from '@orpc/server'
import type {
  InfiniteData,
  UseInfiniteQueryResult,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { orpcReact, wrapper } from './orpc'

describe('createRouterReactClient: useQuery', () => {
  it('types', async () => {
    expectTypeOf(orpcReact.user.create.useQuery).toMatchTypeOf<
      (input: { name: string }) => UseQueryResult<
        { id: string; name: string },
        unknown
      >
    >()
  })

  it('simple', async () => {
    const { result } = renderHook(
      () => orpcReact.user.find.useQuery({ id: '123' }),
      {
        wrapper,
      },
    )

    expect(result.current.status).toEqual('pending')
    await waitFor(() => expect(result.current.status).toEqual('success'))
    expect(result.current.data).toEqual({ id: '123', name: 'name' })
  })

  it('with error', async () => {
    const { result } = renderHook(
      () => orpcReact.willThrow.useQuery(undefined),
      {
        wrapper,
      },
    )

    await waitFor(() => expect(result.current.status).toEqual('error'))
    expect(result.current.error).toBeInstanceOf(ORPCError)
    const error = result.current.error as ORPCError<any, any>
    expect(error.code).toEqual('INTERNAL_SERVER_ERROR')
  })
})
describe('createRouterReactClient: useInfiniteQuery', () => {
  it('types', () => {
    ;() => {
      expectTypeOf(orpcReact.user.list.useInfiniteQuery).toMatchTypeOf<
        (
          input: { keywords?: string },
          options: any,
        ) => UseInfiniteQueryResult<
          InfiniteData<{
            nextCursor: number
            users: { id: number; name: string }[]
          }>,
          unknown
        >
      >()

      const query = orpcReact.user.list.useInfiniteQuery(
        {},
        {
          initialPageParam: undefined, // TODO: remove this when undefined is supported
          getNextPageParam: (lastPage) => {
            expectTypeOf(lastPage).toMatchTypeOf<{ nextCursor: number }>()
            return lastPage.nextCursor
          },
        },
      )

      expectTypeOf(query.data?.pages[0]).toMatchTypeOf<
        | undefined
        | { nextCursor: number; users: { id: number; name: string }[] }
      >()
    }
  })

  it('simple', async () => {
    const { result } = renderHook(
      () =>
        orpcReact.user.list.useInfiniteQuery(
          {},
          {
            initialPageParam: undefined,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          },
        ),
      {
        wrapper,
      },
    )

    expect(result.current.status).toEqual('pending')

    await waitFor(() => expect(result.current.status).toEqual('success'))
    expect(result.current.data?.pages[0]).toEqual({
      nextCursor: 3,
      users: [
        { id: 0, name: 'name' },
        { id: 1, name: 'name' },
        { id: 2, name: 'name' },
      ],
    })

    result.current.fetchNextPage()
    await waitFor(() => expect(result.current.data?.pages.length).toBe(2))
    expect(result.current.data?.pages[1]).toEqual({
      nextCursor: 6,
      users: [
        { id: 3, name: 'name' },
        { id: 4, name: 'name' },
        { id: 5, name: 'name' },
      ],
    })
  })
})

describe('createRouterReactClient: useMutation', () => {
  it('types', async () => {
    ;() => {
      orpcReact.user.create.useMutation({
        onSuccess: (data, variable) => {
          expectTypeOf(data).toMatchTypeOf<{ id: string; name: string }>()
          expectTypeOf(variable).toMatchTypeOf<{ name: string }>()
        },
      })

      expectTypeOf(orpcReact.user.create.useMutation).toMatchTypeOf<
        (
          options?: any,
        ) => UseMutationResult<
          { id: string; name: string },
          unknown,
          { name: string }
        >
      >()
    }
  })

  it('simple', async () => {
    const { result } = renderHook(() => orpcReact.user.create.useMutation(), {
      wrapper,
    })

    expect(result.current.status).toEqual('idle')

    result.current.mutate({ name: 'new name' })
    await waitFor(() => expect(result.current.status).toEqual('success'))

    expect(result.current.data).toMatchObject({ name: 'new name' })
  })

  it('with error', async () => {
    const { result } = renderHook(
      () => orpcReact.willThrow.useMutation(undefined),
      {
        wrapper,
      },
    )

    result.current.mutate(undefined)
    await waitFor(() => expect(result.current.status).toEqual('error'))
    expect(result.current.error).toBeInstanceOf(ORPCError)
    const error = result.current.error as ORPCError<any, any>
    expect(error.code).toEqual('INTERNAL_SERVER_ERROR')
  })
})
