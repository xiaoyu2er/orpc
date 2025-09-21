import type { Promisable } from '@orpc/shared'
import type { QueryFunction, QueryFunctionContext, QueryKey } from '@tanstack/query-core'

export interface experimental_SerializableStreamedQueryOptions {
  /**
   * Determines how data is handled when the query is refetched.
   *
   * - `'reset'`: Clears existing data and sets the query back to a pending state.
   * - `'append'`: Appends new data chunks to the existing data.
   * - `'replace'`: Collects all streamed data and replaces the cache once the stream finishes.
   *
   * @default 'reset'
   */
  refetchMode?: 'append' | 'reset' | 'replace'

  /**
   * Limits the number of data chunks stored in the query result.
   * Older chunks are removed when the limit is reached.
   */
  maxChunks?: number
}

/**
 * A variant of `streamedQuery` where:
 * - Options are serializable
 * - The output is predictable
 */
export function experimental_serializableStreamedQuery<
  TQueryFnData = unknown,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryFn: (
    context: QueryFunctionContext<TQueryKey>,
  ) => Promisable<AsyncIterable<TQueryFnData>>,
  { refetchMode = 'reset', maxChunks }: experimental_SerializableStreamedQueryOptions = {},
): QueryFunction<Array<TQueryFnData>, TQueryKey> {
  /**
   * below code is copy from old `streamedQuery`: https://github.com/TanStack/query/blob/9973e0f1d82acd6ccf5a49d9a0b5e7e401fc5489/packages/query-core/src/streamedQuery.ts#L19
   */
  return async (context) => {
    const query = context.client
      .getQueryCache()
      .find({ queryKey: context.queryKey, exact: true })
    const isRefetch = !!query && query.state.data !== undefined

    if (isRefetch && refetchMode === 'reset') {
      query.setState({
        status: 'pending',
        data: undefined,
        error: null,
        fetchStatus: 'fetching',
      })
    }

    let result: Array<TQueryFnData> = []
    const stream = await queryFn(context)

    for await (const chunk of stream) {
      if (context.signal.aborted) {
        break
      }

      // don't append to the cache directly when replace-refetching
      if (!isRefetch || refetchMode !== 'replace') {
        context.client.setQueryData<Array<TQueryFnData>>(
          context.queryKey,
          (prev = []) => {
            return addToEnd(prev, chunk, maxChunks)
          },
        )
      }
      result = addToEnd(result, chunk, maxChunks)
    }

    // finalize result: replace-refetching needs to write to the cache
    if (isRefetch && refetchMode === 'replace' && !context.signal.aborted) {
      context.client.setQueryData<Array<TQueryFnData>>(context.queryKey, result)
    }

    return context.client.getQueryData(context.queryKey)!
  }
}

function addToEnd<T>(items: Array<T>, item: T, max = 0): Array<T> {
  const newItems = [...items, item]
  return max && newItems.length > max ? newItems.slice(1) : newItems
}
