import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { Suspense } from 'solid-js'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router
        root={props => (
          <>
            <Suspense>{props.children}</Suspense>
          </>
        )}
      >
        <FileRoutes />
      </Router>
    </QueryClientProvider>
  )
}
