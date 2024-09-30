import { Context, MergeContext, Meta, Promisable } from './types'
import { mergeMiddlewares } from './utils'

export interface Middleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput
> {
  (input: TInput, context: TContext, meta: Meta<TOutput>): Promisable<{
    context?: TExtraContext
  } | void>
}

export interface MapInputMiddleware<TInput, TMappedInput> {
  (input: TInput): TMappedInput
}

export interface DecoratedMiddleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput
> extends Middleware<TContext, TExtraContext, TInput, TOutput> {
  concat<UExtraContext extends Context, UInput>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UInput & TInput,
      TOutput
    >
  ): DecoratedMiddleware<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    UInput & TInput,
    TOutput
  >

  concat<UExtraContext extends Context, UMappedInput extends TInput>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      TOutput
    >,
    mapInput: MapInputMiddleware<TInput, UMappedInput>
  ): DecoratedMiddleware<TContext, MergeContext<TExtraContext, UExtraContext>, TInput, TOutput>
}

export function decorateMiddleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput
>(
  middleware: Middleware<TContext, TExtraContext, TInput, TOutput>
): DecoratedMiddleware<TContext, TExtraContext, TInput, TOutput> {
  const extended = new Proxy(middleware, {
    get(target, prop) {
      if (prop === 'concat') {
        return (...args: any[]) => {
          const [middleware_, mapInput] = args

          const middleware: Middleware<any, any, any, any> =
            typeof mapInput === 'function'
              ? (input, ...rest) => middleware_(mapInput(input), ...rest)
              : middleware_

          return decorateMiddleware(mergeMiddlewares(target, middleware))
        }
      }

      return Reflect.get(target, prop)
    },
  })

  return extended as DecoratedMiddleware<TContext, TExtraContext, TInput, TOutput>
}
