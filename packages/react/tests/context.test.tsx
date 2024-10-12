import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createORPCContext, createORPCReact } from '../src'
import { client, orpcReact, queryClient, type router, wrapper } from './orpc'

it('support multiple context', async () => {
  const context2 = createORPCContext()
  const queryClient2 = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const orpcReact2 = createORPCReact<typeof router>({ context: context2 })

  const wrapper2 = ({ children }: { children: React.ReactNode }) => {
    const W1 = wrapper
    return (
      <W1>
        <context2.Provider
          value={{ client: client, queryClient: queryClient2 }}
        >
          <QueryClientProvider client={queryClient2}>
            {children}
          </QueryClientProvider>
        </context2.Provider>
      </W1>
    )
  }

  const hook1 = renderHook(
    () => orpcReact.withTimestamp.useQuery({ id: '123' }),
    {
      wrapper: wrapper2,
    },
  )
  await waitFor(() => expect(hook1.result.current.status).toEqual('success'))
  const hook2 = renderHook(
    () => orpcReact2.withTimestamp.useQuery({ id: '123' }),
    {
      wrapper: wrapper2,
    },
  )
  await waitFor(() => expect(hook2.result.current.status).toEqual('success'))

  expect(hook1.result.current.data).not.toBe(hook2.result.current.data)
  expect(hook1.result.current.data?.timestamp).not.toEqual(
    hook2.result.current.data?.timestamp,
  )

  expect(queryClient.getQueryData(['withTimestamp', { id: '123' }])).toBe(
    hook1.result.current.data,
  )
  expect(queryClient.getQueryData(['withTimestamp', { id: '123' }])).not.toBe(
    hook2.result.current.data,
  )

  expect(queryClient2.getQueryData(['withTimestamp', { id: '123' }])).toBe(
    hook2.result.current.data,
  )
  expect(queryClient2.getQueryData(['withTimestamp', { id: '123' }])).not.toBe(
    hook1.result.current.data,
  )
})
