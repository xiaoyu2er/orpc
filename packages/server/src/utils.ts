import { Middleware } from './middleware'
import { Context, MergeContext, Promisable } from './types'

export function mergeContext<A extends Context, B extends Context>(a: A, b: B): MergeContext<A, B> {
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
  return async (input, context, ...rest) => {
    const onSuccessFns: ((...args: any) => Promisable<void>)[] = []
    const onErrorFns: ((...args: any) => Promisable<void>)[] = []
    const onFinishFns: ((...args: any) => Promisable<void>)[] = []

    const onError = async (error: unknown) => {
      let currentError = error

      for (const onErrorFn of onErrorFns) {
        try {
          await onErrorFn(currentError)
        } catch (error) {
          currentError = error
        }
      }
    }

    const onSuccess = async (output: unknown) => {
      for (const onSuccessFn of onSuccessFns) {
        await onSuccessFn(output)
      }
    }

    const onFinish = async (output: unknown, error: unknown) => {
      for (const onFinishFn of onFinishFns) {
        await onFinishFn(output, error)
      }
    }

    let extraContext: Context = undefined

    for (const middleware of middlewares) {
      try {
        const result = await middleware(input, mergeContext(context, extraContext), ...rest)

        if (result?.context) {
          extraContext = mergeContext(extraContext, result.context)
        }

        if (result?.onSuccess) {
          onSuccessFns.push(result.onSuccess)
        }

        if (result?.onError) {
          onErrorFns.push(result.onError)
        }

        if (result?.onFinish) {
          onFinishFns.push(result.onFinish)
        }
      } catch (error) {
        await onError(error)
        throw error
      }
    }

    return {
      context: extraContext,
      onError,
      onSuccess,
      onFinish,
    }
  }
}
