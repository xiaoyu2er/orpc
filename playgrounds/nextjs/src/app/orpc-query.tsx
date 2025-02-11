'use client'

import { orpc } from '@/lib/orpc'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

export function ListPlanetsQuery() {
  const { data, refetch, fetchNextPage, hasNextPage, isLoading, status } = useInfiniteQuery(
    orpc.planet.list.infiniteOptions({
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

      <SSE />
    </div>

  )
}

function SSE() {
  const stream = useMemo(() => orpc.stream.call(), [])
  const [messages, setMessages] = useState<{ time: Date }[]>([])

  useEffect(() => {
    stream.then(async (iterator) => {
      for await (const data of iterator) {
        setMessages(messages => [...messages, data])
      }
    })
  }, [stream])

  return (
    <ul>
      {messages.map((message, i) => (
        <li key={i}>
          {message.time.toLocaleString()}
        </li>
      ))}
    </ul>
  )
}
