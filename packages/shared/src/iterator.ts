export function mapAsyncIterator<TYield, TReturn, TNext, TMapYield, TMapReturn = TReturn>(
  iterator: AsyncIterator<TYield, TReturn, TNext>,
  maps: {
    yield: (value: NoInfer<TYield>) => TMapYield
    return?: (value: NoInfer<TReturn>) => TMapReturn
    error?: (error: unknown) => unknown
  },
): AsyncIteratorObject<TMapYield, TMapReturn, TNext> {
  const mapped: AsyncIteratorObject<TMapYield, TMapReturn, TNext> = {
    async next(...args) {
      try {
        const { done, value } = await iterator.next(...args)

        if (done) {
          return maps.return ? maps.return(value) : value
        }

        return maps.yield(value) as any
      }
      catch (error) {
        throw maps.error ? maps.error(error) : error
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
