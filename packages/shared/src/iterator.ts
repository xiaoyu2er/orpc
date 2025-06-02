import { once, sequential } from './function'
import { AsyncIdQueue } from './queue'

export function isAsyncIteratorObject(maybe: unknown): maybe is AsyncIteratorObject<any, any, any> {
  if (!maybe || typeof maybe !== 'object') {
    return false
  }

  return Symbol.asyncIterator in maybe && typeof maybe[Symbol.asyncIterator] === 'function'
}

export interface CreateAsyncIteratorObjectCleanupFn {
  (reason: 'return' | 'throw' | 'next' | 'dispose'): Promise<void>
}

export function createAsyncIteratorObject<T, TReturn, TNext>(
  next: () => Promise<IteratorResult<T, TReturn>>,
  cleanup: CreateAsyncIteratorObjectCleanupFn,
): AsyncIteratorObject<T, TReturn, TNext> & AsyncGenerator<T, TReturn, TNext> {
  let isExecuteComplete = false
  let isDone = false

  const iterator = {
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
          await cleanup('next')
        }
      }
    }),
    async return(value: any) {
      isDone = true
      if (!isExecuteComplete) {
        isExecuteComplete = true
        await cleanup('return')
      }

      return { done: true, value }
    },
    async throw(err: any) {
      isDone = true
      if (!isExecuteComplete) {
        isExecuteComplete = true
        await cleanup('throw')
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
        await cleanup('dispose')
      }
    },
    [Symbol.asyncIterator]() {
      return iterator
    },
  }

  return iterator
}

export function replicateAsyncIterator<T, TReturn, TNext>(
  source: AsyncIterator<T, TReturn, TNext>,
  count: number,
): (AsyncIteratorObject<T, TReturn, TNext> & AsyncGenerator<T, TReturn, TNext>)[] {
  const queue = new AsyncIdQueue<IteratorResult<T, TReturn>>()

  const replicated: (AsyncIteratorObject<T, TReturn, TNext> & AsyncGenerator<T, TReturn, TNext>)[] = []

  let error: undefined | { value: unknown }

  const start = once(async () => {
    try {
      while (true) {
        const item = await source.next()

        for (let id = 0; id < count; id++) {
          if (queue.isOpen(id)) {
            queue.push(id, item)
          }
        }

        if (item.done) {
          break
        }
      }
    }
    catch (e) {
      error = { value: e }
    }
  })

  for (let id = 0; id < count; id++) {
    queue.open(id)
    replicated.push(createAsyncIteratorObject(
      () => {
        start()

        return new Promise((resolve, reject) => {
          queue.pull(id)
            .then(resolve)
            .catch(reject)

          new Promise(r => r(undefined)).then(() => {
            if (error) {
              reject(error.value)
            }
          })
        })
      },
      async (reason) => {
        queue.close({ id })

        if (reason !== 'next') {
          if (replicated.every((_, id) => !queue.isOpen(id))) {
            await source?.return?.()
          }
        }
      },
    ))
  }

  return replicated
}
