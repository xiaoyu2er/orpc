import type {
  RouterClientWithContractRouter,
  RouterClientWithRouter,
} from '@orpc/client'
import type { QueryClient } from '@tanstack/react-query'
import { type Context, createContext, useContext } from 'react'

export interface ORPCContextPayload {
  client: RouterClientWithContractRouter<any> | RouterClientWithRouter<any>
  queryClient: QueryClient
}

export type ORPCContext = Context<ORPCContextPayload | undefined>

export function createORPCContext(): ORPCContext {
  return createContext<ORPCContextPayload | undefined>(undefined)
}

export const defaultORPCContext = createORPCContext()

export const ORPCContextProvider = defaultORPCContext.Provider

export function useORPCContext(context?: ORPCContext) {
  const r = useContext(context ?? defaultORPCContext)

  if (!r) {
    throw new Error(
      'Please wrap your app inside <ORPCContextProvider /> or a custom one.',
    )
  }

  return r
}
