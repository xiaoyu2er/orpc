export type AnyFunction = (...args: any[]) => any

export function once<T extends () => any>(fn: T): () => ReturnType<T> {
  let cached: { result: ReturnType<T> } | undefined

  return (): ReturnType<T> => {
    if (cached) {
      return cached.result
    }

    const result = fn()
    cached = { result }

    return result
  }
}

export function sequential<A extends any[], R>(
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  let lastOperationPromise: Promise<any> = Promise.resolve()

  return (...args: A): Promise<R> => {
    return lastOperationPromise = lastOperationPromise.catch(() => { }).then(() => {
      return fn(...args)
    })
  }
}
