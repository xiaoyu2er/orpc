import { createInfiniteQuery } from '@tanstack/solid-query'
import { For } from 'solid-js'
import { orpc } from '~/lib/orpc'

export function ListPlanetsQuery() {
  const { data, refetch, fetchNextPage, hasNextPage, isLoading, status } = createInfiniteQuery(
    () => orpc.planet.list.infiniteOptions({
      input: cursor => ({ cursor }),
      getNextPageParam: lastPage => (lastPage.at(-1)?.id ?? -1) + 1,
      initialPageParam: 0,
    }),
  )

  if (status === 'pending') {
    return <p>Loading...</p>
  }

  if (status === 'error') {
    return (
      <p>
        Something went wrong.
      </p>
    )
  }

  return (
    <div>
      <h2>oRPC and Tanstack Query | List Planets example</h2>

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
          <For each={data.pages}>
            {page => (
              <For each={page}>
                {planet => (
                  <tr>
                    <td>{planet.id}</td>
                    <td>{planet.name}</td>
                    <td>{planet.description}</td>
                    <td>{planet.imageUrl}</td>
                  </tr>
                )}
              </For>
            )}
          </For>
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
    </div>

  )
}
