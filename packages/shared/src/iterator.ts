import type { Promisable } from 'type-fest'

export function isAsyncIteratorObject(maybe: unknown): maybe is AsyncIteratorObject<any, any, any> {
  if (!maybe || typeof maybe !== 'object') {
    return false
  }

  return Symbol.asyncIterator in maybe && typeof maybe[Symbol.asyncIterator] === 'function'
}

export interface CreateAsyncIteratorObjectOptions {
  onComplete?: (reason: 'return' | 'throw' | 'next' | 'dispose') => Promisable<void>
}

export function createAsyncIteratorObject<T, TReturn, TNext>(
  next: () => Promise<IteratorResult<T, TReturn>>,
  options: CreateAsyncIteratorObjectOptions = {},
): AsyncIteratorObject<T, TReturn, TNext> & AsyncGenerator<T, TReturn, TNext> {
  const iterator: AsyncIteratorObject<T, TReturn, TNext> & AsyncGenerator<T, TReturn, TNext> = {
    async next() {
      let isCompleteCalled = false

      try {
        const result = await next()

        if (result.done && !isCompleteCalled) {
          isCompleteCalled = true
          await options.onComplete?.('next')
        }

        return result
      }
      catch (err) {
        if (!isCompleteCalled) {
          isCompleteCalled = true
          await options.onComplete?.('next')
        }

        throw err
      }
    },
    async return(value) {
      await options.onComplete?.('return')
      return { done: true, value } as any
    },
    async throw(err) {
      await options.onComplete?.('throw')
      throw err
    },
    [Symbol.asyncIterator]() {
      return iterator
    },
    /**
     * asyncDispose symbol only available in esnext, we should fallback to Symbol.for('asyncDispose')
     */
    async [(Symbol as any).asyncDispose as typeof Symbol extends { asyncDispose: infer T } ? T : any ?? Symbol.for('asyncDispose')]() {
      await options.onComplete?.('dispose')
    },
  }

  return iterator
}
