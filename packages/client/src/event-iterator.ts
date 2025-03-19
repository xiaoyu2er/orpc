import { isTypescriptObject } from '@orpc/shared'
import { getEventMeta, withEventMeta } from '@orpc/standard-server'

export function mapEventIterator<TYield, TReturn, TNext, TMap = TYield | TReturn>(
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
          const meta = getEventMeta(value)
          if (meta && isTypescriptObject(mappedValue)) {
            mappedValue = withEventMeta(mappedValue, meta)
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
        const meta = getEventMeta(error)
        if (meta && isTypescriptObject(mappedError)) {
          mappedError = withEventMeta(mappedError, meta)
        }
      }

      throw mappedError
    }
    finally {
      await iterator.return?.()
    }
  })()
}
