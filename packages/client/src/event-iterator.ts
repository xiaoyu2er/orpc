import { AsyncIteratorClass, isTypescriptObject } from '@orpc/shared'
import { getEventMeta, withEventMeta } from '@orpc/standard-server'

export function mapEventIterator<TYield, TReturn, TNext, TMap = TYield | TReturn>(
  iterator: AsyncIterator<TYield, TReturn, TNext>,
  maps: {
    value: (value: NoInfer<TYield | TReturn>, done: boolean | undefined) => Promise<TMap>
    error: (error: unknown) => Promise<unknown>
  },
): AsyncIteratorClass<TMap, TMap, TNext> {
  return new AsyncIteratorClass(async () => {
    try {
      const { done, value } = await iterator.next()

      let mappedValue = await maps.value(value, done)

      if (mappedValue !== value) {
        const meta = getEventMeta(value)
        if (meta && isTypescriptObject(mappedValue)) {
          mappedValue = withEventMeta(mappedValue, meta)
        }
      }

      return { done, value: mappedValue }
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
  }, async () => {
    await iterator.return?.()
  })
}
