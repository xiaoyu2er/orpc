'use client'

import { CreatePlanetMutationForm } from './orpc-mutation'
import { SSRListPlanets } from './orpc-query'
import { CreatePlanetServerAction } from './orpc-server-actions'

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
      <CreatePlanetServerAction />
      <hr />
      <CreatePlanetMutationForm />
      <hr />
      <SSRListPlanets />
    </div>
  )
}
