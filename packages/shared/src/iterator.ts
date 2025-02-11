export function isAsyncIteratorObject(maybe: unknown): maybe is AsyncIteratorObject<any, any, any> {
  if (!maybe || typeof maybe !== 'object') {
    return false
  }

  return Symbol.asyncIterator in maybe
}

export function mapAsyncIterator<TYield, TReturn, TNext, TMapYield, TMapReturn = TReturn>(
  iterator: AsyncIterator<TYield, TReturn, TNext>,
  maps: {
    yield: (value: NoInfer<TYield>) => TMapYield
    return?: (value: NoInfer<TReturn>) => TMapReturn
    error?: (error: unknown) => unknown
  },
): AsyncGenerator<TMapYield, TMapReturn, TNext> {
  const mappedGeneratorFn = async function* () {
    try {
      while (true) {
        const { done, value } = await iterator.next()
        if (done) {
          return maps.return ? maps.return(value) : value
        }

        yield maps.yield(value)
      }
    }
    catch (error) {
      throw maps.error ? maps.error(error) : error
    }
    finally {
      await iterator.return?.() // cancel the original generator
    }
  }

  return mappedGeneratorFn() as any
}
