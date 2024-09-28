import { HTTPMethod } from '@orpc/contract'
import { Context, MergeContext } from './types'

export interface Middleware<
  TContext extends Context = any,
  TExtraContext extends Context = any,
  TInput = any
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

export interface MapInputMiddleware<TInput = any, TMappedInput = any> {
  (input: TInput): TMappedInput
}

export interface DecoratedMiddleware<
  TContext extends Context = any,
  TExtraContext extends Context = any,
  TInput = unknown
> extends Middleware<TContext, TExtraContext, TInput> {
  concat<UExtraContext extends Context, UInput>(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtraContext, UInput & TInput>
  ): DecoratedMiddleware<TContext, MergeContext<TExtraContext, UExtraContext>, UInput & TInput>

  concat<UExtraContext extends Context, UMappedInput extends TInput>(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtraContext, UMappedInput>,
    mapInput: MapInputMiddleware<TInput, UMappedInput>
  ): DecoratedMiddleware<TContext, MergeContext<TExtraContext, UExtraContext>, TInput>
}

export function decorateMiddleware<
  TContext extends Context = Context,
  TExtraContext extends Context = Context,
  TInput = unknown
>(
  middleware: Middleware<TContext, TExtraContext, TInput>
): DecoratedMiddleware<TContext, TExtraContext, TInput> {
  const extended = new Proxy(middleware, {
    get(target, prop) {
      if (prop === 'concat') {
        return (...args: any[]) => {
          const [middleware_, mapInput] = args

          const middleware =
            typeof mapInput === 'function'
              ? (input: any, ...rest: any) => middleware_(mapInput(input), ...rest)
              : middleware_

          return decorateMiddleware((input: any, context: any, meta: any) => {
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

  return extended as DecoratedMiddleware<TContext, TExtraContext, TInput>
}
