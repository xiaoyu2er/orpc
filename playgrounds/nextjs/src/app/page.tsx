'use client'

import { orpc } from '@/lib/orpc'
import { pong, visitScalar } from './actions'

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

      <ServerActionsTest />
      <hr />
      <AddPlanet />
      <hr />
      <SSRListPlanets />
    </div>
  )
}

function SSRListPlanets() {
  const { data, refetch, fetchNextPage, hasNextPage }
    = orpc.planet.list.useSuspenseInfiniteQuery({
      input: {},
      getNextPageParam: lastPage => (lastPage.at(-1)?.id ?? -1) + 1,
    })

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Description</th>
          <th>Image</th>
        </tr>
      </thead>
      <tbody>
        {data.pages.flatMap((page, i) =>
          page.map(planet => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={`${planet.id}-${i}`}>
              <td>{planet.id}</td>
              <td>{planet.name}</td>
              <td>{planet.description}</td>
              <td>{planet.imageUrl}</td>
            </tr>
          )),
        )}
      </tbody>

      <tfoot>
        <tr>
          <td colSpan={4}>
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={!hasNextPage}
            >
              Load more
            </button>

            <button type="button" onClick={() => refetch()}>
              Refresh
            </button>
          </td>
        </tr>
      </tfoot>
    </table>
  )
}

function AddPlanet() {
  const utils = orpc.useUtils()

  const { mutate } = orpc.planet.create.useMutation({
    onSuccess() {
      utils.planet.invalidate()
    },
    onError(error) {
      alert(error.message)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const form = new FormData(e.target as HTMLFormElement)

        const name = form.get('name') as string
        const description
          = (form.get('description') as string | null) ?? undefined
        const image = form.get('image') as File

        mutate({
          name,
          description,
          image: image.size > 0 ? image : undefined,
        })
      }}
    >
      <label>
        Name
        <input type="text" name="name" required />
      </label>
      <label>
        Description
        <textarea name="description" />
      </label>
      <label>
        Image
        <input type="file" name="image" accept="image/*" />
      </label>
      <button type="submit">Submit</button>
    </form>
  )
}

function ServerActionsTest() {
  return (
    <form>
      Server Actions Test:
      {' '}
      <button type="submit" formAction={visitScalar}>
        Visit Scalar
      </button>
      <button
        type="button"
        onClick={() => {
          pong(undefined).then((result) => {
            alert(result)
          })
        }}
      >
        Pong
      </button>
    </form>
  )
}
