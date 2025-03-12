import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { CreatePlanetMutationForm } from './orpc-mutation'
import { ListPlanetsQuery } from './orpc-query'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <h1>ORPC Playground</h1>
        <p>
          You can visit the
          {' '}
          <a href="/scalar">Scalar API Reference</a>
          {' '}
          page.
        </p>
        <hr />
        <CreatePlanetMutationForm />
        <hr />
        <ListPlanetsQuery />
      </div>
    </QueryClientProvider>
  )
}
