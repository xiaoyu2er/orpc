import { createORPCClient } from '@orpc/client'
import { ORPCError, createRouterHandler, initORPC } from '@orpc/server'
import { fetchHandler } from '@orpc/server/fetch'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { z } from 'zod'
import { ORPCContextProvider, createORPCReact } from '../src'

export const orpc = initORPC

export const ping = orpc.handler(() => 'pong')

export const findUser = orpc
  .input(z.object({ id: z.string() }))
  .output(z.object({ id: z.string(), name: z.string() }))
  .handler((input) => {
    return {
      id: input.id,
      name: 'name',
    }
  })

export const willThrow = orpc.handler(() => {
  throw new ORPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'error',
  })
})

export const createUser = orpc
  .input(z.object({ name: z.string() }))
  .output(z.object({ id: z.string(), name: z.string() }))
  .handler((input) => {
    return {
      id: crypto.randomUUID(),
      name: input.name,
    }
  })

export const withTimestamp = orpc
  .input(z.object({ id: z.string() }).optional())
  .output(z.object({ id: z.string().optional(), timestamp: z.date() }))
  .handler((input) => {
    return {
      id: input?.id,
      timestamp: new Date(),
    }
  })

export const router = orpc.router({
  ping,
  user: {
    find: findUser,
    create: createUser,
  },
  willThrow,
  withTimestamp,
})

export const handler = createRouterHandler({
  router,
})

export const client = createORPCClient<typeof router>({
  baseURL: 'http://localhost:3000',
  fetch: (...args) =>
    fetchHandler({
      handler,
      request: new Request(...args),
      context: {},
      hooks: (_, hooks) => {
        hooks.onError((error) => {
          // console.log(error)
        })
      },
    }),
})

export const orpcReact = createORPCReact<typeof router>()
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

export const wrapper = (props: { children: React.ReactNode }) => (
  <ORPCContextProvider value={{ client, queryClient }}>
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  </ORPCContextProvider>
)
