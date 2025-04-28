import type { Promisable } from 'type-fest'
import { sequential } from './function'

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
  let isExecuteComplete = false
  let isDone = false

  const iterator: AsyncIteratorObject<T, TReturn, TNext> & AsyncGenerator<T, TReturn, TNext> = {
    next: sequential(async () => {
      if (isDone) {
        return { done: true, value: undefined as any }
      }

      try {
        const result = await next()

        if (result.done) {
          isDone = true
        }

        return result
      }
      catch (err) {
        isDone = true
        throw err
      }
      finally {
        if (isDone && !isExecuteComplete) {
          isExecuteComplete = true
          await options.onComplete?.('next')
        }
      }
    }),
    async return(value) {
      isDone = true
      if (!isExecuteComplete) {
        isExecuteComplete = true
        await options.onComplete?.('return')
      }

      return { done: true, value } as any
    },
    async throw(err) {
      isDone = true
      if (!isExecuteComplete) {
        isExecuteComplete = true
        await options.onComplete?.('throw')
      }

      throw err
    },
    /**
     * asyncDispose symbol only available in esnext, we should fallback to Symbol.for('asyncDispose')
     */
    async [(Symbol as any).asyncDispose as typeof Symbol extends { asyncDispose: infer T } ? T : any ?? Symbol.for('asyncDispose')]() {
      isDone = true
      if (!isExecuteComplete) {
        isExecuteComplete = true
        await options.onComplete?.('dispose')
      }
    },
    [Symbol.asyncIterator]() {
      return iterator
    },
  }

  return iterator
}
