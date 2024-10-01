import type { Middleware } from './middleware'
import type { Context, Hooks, MergeContext, Promisable } from './types'

export function mergeContext<A extends Context, B extends Context>(
  a: A,
  b: B,
): MergeContext<A, B> {
  if (!a) return b as any
  if (!b) return a as any

  return {
    ...a,
    ...b,
  } as any
}

export function mergeMiddlewares(
  ...middlewares: Middleware<any, any, any, any>[]
): Middleware<any, any, any, any> {
  return async (input, context, meta, ...rest) => {
    let extraContext: Context = undefined

    for (const middleware of middlewares) {
      const mid = await middleware(
        input,
        mergeContext(context, extraContext),
        meta,
        ...rest,
      )
      extraContext = mergeContext(extraContext, mid?.context)
    }

    return { context: extraContext }
  }
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
    onSuccess(fn, opts) {
      const mode = opts?.mode ?? 'push'
      if (mode === 'unshift') {
        onSuccessFns.unshift(fn)
      } else {
        onSuccessFns.push(fn)
      }

      return () => {
        const index = onSuccessFns.indexOf(fn)
        if (index !== -1) onSuccessFns.splice(index, 1)
      }
    },

    onError(fn, opts) {
      const mode = opts?.mode ?? 'unshift'
      if (mode === 'unshift') {
        onErrorFns.unshift(fn)
      } else {
        onErrorFns.push(fn)
      }

      return () => {
        const index = onErrorFns.indexOf(fn)
        if (index !== -1) onErrorFns.splice(index, 1)
      }
    },

    onFinish(fn, opts) {
      const mode = opts?.mode ?? 'push'
      if (mode === 'unshift') {
        onFinishFns.unshift(fn)
      } else {
        onFinishFns.push(fn)
      }

      return () => {
        const index = onFinishFns.indexOf(fn)
        if (index !== -1) onFinishFns.splice(index, 1)
      }
    },
  }

  let error: unknown = undefined
  let output: T | undefined = undefined

  try {
    output = await fn(hooks)

    for (const onSuccessFn of onSuccessFns) {
      await onSuccessFn(output)
    }

    return output
  } catch (e) {
    error = e

    for (const onErrorFn of onErrorFns) {
      try {
        await onErrorFn(error)
      } catch (e) {
        error = e
      }
    }

    throw error
  } finally {
    let hasNewError = false

    for (const onFinishFn of onFinishFns) {
      try {
        await onFinishFn(output, error)
      } catch (e) {
        error = e
        hasNewError = true
      }
    }

    if (hasNewError) {
      // biome-ignore lint/correctness/noUnsafeFinally: this behavior is expected
      throw error
    }
  }
}
