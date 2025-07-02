import type { Promisable } from '@orpc/shared'
import type { QueryFunction, QueryFunctionContext, QueryKey } from '@tanstack/query-core'

export function experimental_liveQuery<
  TQueryFnData = unknown,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryFn: (
    context: QueryFunctionContext<TQueryKey>,
  ) => Promisable<AsyncIterable<TQueryFnData>>,
): QueryFunction<TQueryFnData, TQueryKey> {
  return async (context) => {
    const stream = await queryFn(context)

    for await (const chunk of stream) {
      if (context.signal.aborted) {
        break
      }

      context.client.setQueryData<TQueryFnData>(context.queryKey, chunk)
    }

    return context.client.getQueryData(context.queryKey)!
  }
}
