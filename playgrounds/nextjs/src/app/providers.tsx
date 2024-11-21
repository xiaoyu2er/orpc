'use client'

import { orpcClient, ORPCContext } from '@/lib/orpc'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers(props: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ORPCContext.Provider value={useMemo(() => ({ client: orpcClient, queryClient }), [queryClient])}>
        {props.children}
      </ORPCContext.Provider>
    </QueryClientProvider>
  )
}
