import { getEventSourceMeta, isEventSourceMetaContainer, setEventSourceMeta } from '@orpc/server-standard'

export function mapEventSourceIterator<TYield, TReturn, TNext, TMap = TYield | TReturn>(
  iterator: AsyncIterator<TYield, TReturn, TNext>,
  maps: {
    value: (value: NoInfer<TYield | TReturn>, done: boolean | undefined) => Promise<TMap>
    error: (error: unknown) => Promise<unknown>
  },
): AsyncIteratorObject<TMap, TMap, TNext> {
  const mapped: AsyncIteratorObject<TMap, TMap, TNext> = {
    async next(...args) {
      try {
        const { done, value } = await iterator.next(...args)

        const mappedValue = await maps.value(value, done) as any

        if (mappedValue === value) {
          return { done, value }
        }

        const meta = getEventSourceMeta(value)
        if (meta && isEventSourceMetaContainer(mappedValue)) {
          return { done, value: setEventSourceMeta(mappedValue, meta) }
        }

        return { done, value: mappedValue }
      }
      catch (error) {
        const mappedError = await maps.error(error)

        if (mappedError === error) {
          throw mappedError
        }

        const meta = getEventSourceMeta(error)
        if (meta && isEventSourceMetaContainer(mappedError)) {
          throw setEventSourceMeta(mappedError, meta)
        }

        throw mappedError
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
