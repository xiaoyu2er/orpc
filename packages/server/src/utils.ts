import type { Context, Hooks, MergeContext, Promisable } from './types'

export function mergeContext<A extends Context, B extends Context>(
  a: A,
  b: B,
): MergeContext<A, B> {
  if (!a)
    return b as any
  if (!b)
    return a as any

  return {
    ...a,
    ...b,
  } as any
}

export async function hook<T>(
  fn: (hooks: Hooks<T>) => Promisable<T>,
): Promise<T> {
  const onSuccessFns: ((output: T) => Promisable<void>)[] = []
  const onErrorFns: ((error: unknown) => Promisable<void>)[] = []
  const onFinishFns: ((
    output: T | undefined,
    error: unknown | undefined,
  ) => Promisable<void>)[] = []

  const hooks: Hooks<T> = {
    onSuccess(fn) {
      onSuccessFns.unshift(fn)

      return () => {
        const index = onSuccessFns.indexOf(fn)
        if (index !== -1)
          onSuccessFns.splice(index, 1)
      }
    },

    onError(fn) {
      onErrorFns.unshift(fn)

      return () => {
        const index = onErrorFns.indexOf(fn)
        if (index !== -1)
          onErrorFns.splice(index, 1)
      }
    },

    onFinish(fn) {
      onFinishFns.unshift(fn)

      return () => {
        const index = onFinishFns.indexOf(fn)
        if (index !== -1)
          onFinishFns.splice(index, 1)
      }
    },
  }

  let error: unknown
  let output: T | undefined

  try {
    output = await fn(hooks)

    for (const onSuccessFn of onSuccessFns) {
      await onSuccessFn(output)
    }

    return output
  }
  catch (e) {
    error = e

    for (const onErrorFn of onErrorFns) {
      try {
        await onErrorFn(error)
      }
      catch (e) {
        error = e
      }
    }

    throw error
  }
  finally {
    let hasNewError = false

    for (const onFinishFn of onFinishFns) {
      try {
        await onFinishFn(output, error)
      }
      catch (e) {
        error = e
        hasNewError = true
      }
    }

    if (hasNewError) {
      // eslint-disable-next-line no-unsafe-finally
      throw error
    }
  }
}
