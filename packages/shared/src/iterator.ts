export function mapAsyncIterator<TYield, TReturn, TNext, TMapYield, TMapReturn>(
  iterator: AsyncIterator<TYield, TReturn, TNext>,
  maps: {
    yield: (value: NoInfer<TYield>) => TMapYield
    return: (value: NoInfer<TReturn>) => TMapReturn
    error: (error: unknown) => unknown
  },
): AsyncIteratorObject<TMapYield, TMapReturn, TNext> {
  const mapped: AsyncIteratorObject<TMapYield, TMapReturn, TNext> = {
    async next(...args) {
      try {
        const { done, value } = await iterator.next(...args)

        if (done) {
          return { done, value: maps.return(value) }
        }

        return { done, value: maps.yield(value) }
      }
      catch (error) {
        throw maps.error(error)
      }
    },
    return: iterator.return as any,
    throw: iterator.throw as any,
    [Symbol.asyncIterator]() {
      return mapped
    },
  }

  return mapped
}
