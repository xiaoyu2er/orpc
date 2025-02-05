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
