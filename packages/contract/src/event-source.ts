import { getEventSourceMeta, isEventSourceMetaContainer, setEventSourceMeta } from '@orpc/server-standard'

export function mapEventSourceIterator<TYield, TReturn, TNext, TMap = TYield | TReturn>(
  iterator: AsyncIterator<TYield, TReturn, TNext>,
  maps: {
    value: (value: NoInfer<TYield | TReturn>, done: boolean | undefined) => Promise<TMap>
    error: (error: unknown) => Promise<unknown>
  },
): AsyncGenerator<TMap, TMap, TNext> {
  return (async function* () {
    try {
      while (true) {
        const { done, value } = await iterator.next()

        let mappedValue = await maps.value(value, done) as any

        if (mappedValue !== value) {
          const meta = getEventSourceMeta(value)
          if (meta && isEventSourceMetaContainer(mappedValue)) {
            mappedValue = setEventSourceMeta(mappedValue, meta)
          }
        }

        if (done) {
          return mappedValue
        }

        yield mappedValue
      }
    }
    catch (error) {
      let mappedError = await maps.error(error)

      if (mappedError !== error) {
        const meta = getEventSourceMeta(error)
        if (meta && isEventSourceMetaContainer(mappedError)) {
          mappedError = setEventSourceMeta(mappedError, meta)
        }
      }

      throw mappedError
    }
    finally {
      await iterator.return?.()
    }
  })()
}
