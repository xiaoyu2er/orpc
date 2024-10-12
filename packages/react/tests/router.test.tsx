import { ORPCError } from '@orpc/server'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
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
