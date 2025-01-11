import { CreatePlanetMutationForm } from './orpc-mutation'
import { ListPlanetsQuery } from './orpc-query'
import { OrpcServerAction } from './orpc-server-action'

export default function Home() {
  return (
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
      <OrpcServerAction />
      <hr />
      <CreatePlanetMutationForm />
      <hr />
      <ListPlanetsQuery />
    </div>
  )
}
