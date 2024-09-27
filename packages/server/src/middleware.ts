import { HTTPMethod } from '@orpc/contract'
import { Context, MergeContext } from './types'

export interface Middleware<
  TContext extends Context = any,
  TExtraContext extends Context = any,
  TInput = unknown
> {
  (
    input: TInput,
    context: TContext,
    meta: {
      method: HTTPMethod
      path: string
    }
  ): { context?: TExtraContext } | void
}

export interface ExtendedMiddleware<
  TContext extends Context = any,
  TExtraContext extends Context = any,
  TInput = unknown
> extends Middleware<TContext, TExtraContext, TInput> {
  concat<UExtraContext extends Context, UInput>(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtraContext, UInput & TInput>
  ): ExtendedMiddleware<TContext, MergeContext<TExtraContext, UExtraContext>, UInput & TInput>

  concat<UExtraContext extends Context, UMappedInput extends TInput>(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtraContext, UMappedInput>,
    mapInput: (input: TInput) => UMappedInput
  ): ExtendedMiddleware<TContext, MergeContext<TExtraContext, UExtraContext>, TInput>
}

export function createExtendedMiddleware<
  TContext extends Context = Context,
  TExtraContext extends Context = Context,
  TInput = unknown
>(
  middleware: Middleware<TContext, TExtraContext, TInput>
): ExtendedMiddleware<TContext, TExtraContext, TInput> {
  const extended = new Proxy(middleware, {
    get(target, prop) {
      if (prop === 'concat') {
        return (...args: any[]) => {
          const [middleware_, mapInput] = args

          const middleware =
            typeof mapInput === 'function'
              ? new Proxy(middleware_, {
                  apply(_target, _thisArg, [input, ...rest]) {
                    return target(mapInput(input), ...(rest as [any, any]))
                  },
                })
              : middleware_

          return createExtendedMiddleware((input: any, context: any, meta: any) => {
            const r1 = target(input, context, meta)
            const r2 = middleware(
              input,
              {
                ...context,
                ...r1?.context,
              },
              meta
            )

            return {
              context: {
                ...r1?.context,
                ...r2?.context,
              },
            }
          })
        }
      }

      return Reflect.get(target, prop)
    },
  })

  return extended as any
}
