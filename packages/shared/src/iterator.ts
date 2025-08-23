import type { SetSpanErrorOptions } from './otel'
import { once, sequential } from './function'
import { runInSpanContext, setSpanError, startSpan } from './otel'
import { AsyncIdQueue } from './queue'

export function isAsyncIteratorObject(maybe: unknown): maybe is AsyncIteratorObject<any, any, any> {
  if (!maybe || typeof maybe !== 'object') {
    return false
  }

  return 'next' in maybe && typeof maybe.next === 'function' && Symbol.asyncIterator in maybe && typeof maybe[Symbol.asyncIterator] === 'function'
}

export interface AsyncIteratorClassNextFn<T, TReturn> {
  (): Promise<IteratorResult<T, TReturn>>
}

export interface AsyncIteratorClassCleanupFn {
  (reason: 'return' | 'throw' | 'next' | 'dispose'): Promise<void>
}

const fallbackAsyncDisposeSymbol: unique symbol = Symbol.for('asyncDispose')
const asyncDisposeSymbol: typeof Symbol extends { asyncDispose: infer T } ? T : typeof fallbackAsyncDisposeSymbol = (Symbol as any).asyncDispose ?? fallbackAsyncDisposeSymbol

export class AsyncIteratorClass<T, TReturn = unknown, TNext = unknown> implements AsyncIteratorObject<T, TReturn, TNext>, AsyncGenerator<T, TReturn, TNext> {
  #isDone = false
  #isExecuteComplete = false
  #cleanup: AsyncIteratorClassCleanupFn
  #next: AsyncIteratorClassNextFn<T, TReturn>

  constructor(next: AsyncIteratorClassNextFn<T, TReturn>, cleanup: AsyncIteratorClassCleanupFn) {
    this.#cleanup = cleanup
    this.#next = sequential(async () => {
      if (this.#isDone) {
        return { done: true, value: undefined as any }
      }

      try {
        const result = await next()

        if (result.done) {
          this.#isDone = true
        }

        return result
      }
      catch (err) {
        this.#isDone = true
        throw err
      }
      finally {
        if (this.#isDone && !this.#isExecuteComplete) {
          this.#isExecuteComplete = true
          await this.#cleanup('next')
        }
      }
    })
  }

  next(): Promise<IteratorResult<T, TReturn>> {
    return this.#next()
  }

  async return(value?: any): Promise<IteratorResult<T, TReturn>> {
    this.#isDone = true
    if (!this.#isExecuteComplete) {
      this.#isExecuteComplete = true
      await this.#cleanup('return')
    }

    return { done: true, value }
  }

  async throw(err: any): Promise<IteratorResult<T, TReturn>> {
    this.#isDone = true
    if (!this.#isExecuteComplete) {
      this.#isExecuteComplete = true
      await this.#cleanup('throw')
    }

    throw err
  }

  /**
   * asyncDispose symbol only available in esnext, we should fallback to Symbol.for('asyncDispose')
   */
  async [asyncDisposeSymbol](): Promise<void> {
    this.#isDone = true
    if (!this.#isExecuteComplete) {
      this.#isExecuteComplete = true
      await this.#cleanup('dispose')
    }
  }

  [Symbol.asyncIterator](): this {
    return this
  }
}

export function replicateAsyncIterator<T, TReturn, TNext>(
  source: AsyncIterator<T, TReturn, TNext>,
  count: number,
): (AsyncIteratorClass<T, TReturn, TNext>)[] {
  const queue = new AsyncIdQueue<IteratorResult<T, TReturn>>()

  const replicated: AsyncIteratorClass<T, TReturn, TNext>[] = []

  let error: undefined | { value: unknown }

  const start = once(async () => {
    try {
      while (true) {
        const item = await source.next()

        for (let i = 0; i < count; i++) {
          const id = i.toString()

          if (queue.isOpen(id)) {
            queue.push(id, item)
          }
        }

        if (item.done) {
          break
        }
      }
    }
    catch (reason) {
      error = { value: reason }

      queue.waiterIds.forEach((id) => {
        queue.close({ id, reason })
      })
    }
  })

  for (let i = 0; i < count; i++) {
    const id = i.toString()

    queue.open(id)
    replicated.push(new AsyncIteratorClass(
      () => {
        start()

        return new Promise((resolve, reject) => {
          if (!error || queue.hasBufferedItems(id)) {
            queue.pull(id)
              .then(resolve)
              .catch(reject)
          }
          else {
            reject(error.value)
          }
        })
      },
      async (reason) => {
        queue.close({ id })

        if (reason !== 'next') {
          if (!queue.length) {
            await source?.return?.()
          }
        }
      },
    ))
  }

  return replicated
}

export interface AsyncIteratorWithSpanOptions extends SetSpanErrorOptions {
  /**
   * The name of the span to create.
   */
  name: string
}

export function asyncIteratorWithSpan<T, TReturn, TNext>(
  { name, ...options }: AsyncIteratorWithSpanOptions,
  iterator: AsyncIterator<T, TReturn, TNext>,
): AsyncIteratorClass<T, TReturn, TNext> {
  let span: ReturnType<typeof startSpan> | undefined

  return new AsyncIteratorClass(
    async () => {
      span ??= startSpan(name)

      try {
        const result = await runInSpanContext(span, () => iterator.next())
        span?.addEvent(result.done ? 'completed' : 'yielded')
        return result
      }
      catch (err) {
        setSpanError(span, err, options)
        throw err
      }
    },
    async (reason) => {
      try {
        if (reason !== 'next') {
          await runInSpanContext(span, () => iterator.return?.())
        }
      }
      catch (err) {
        setSpanError(span, err, options)
        throw err
      }
      finally {
        span?.end()
      }
    },
  )
}
