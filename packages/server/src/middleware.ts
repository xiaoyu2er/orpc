import type { Context, MergeContext, Meta, Promisable } from './types'
import { mergeMiddlewares } from './utils'

export type Middleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput,
> = (
  input: TInput,
  context: TContext,
  meta: Meta<TOutput>,
) => Promisable<
  TExtraContext extends undefined ? void : { context: TExtraContext }
>

export type MapInputMiddleware<TInput, TMappedInput> = (
  input: TInput,
) => TMappedInput

export interface DecoratedMiddleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput,
> extends Middleware<TContext, TExtraContext, TInput, TOutput> {
  concat<UExtraContext extends Context = undefined, UInput = TInput>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UInput & TInput,
      TOutput
    >,
  ): DecoratedMiddleware<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInput & UInput,
    TOutput
  >

  concat<
    UExtraContext extends Context = undefined,
    UInput = TInput,
    UMappedInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      TOutput
    >,
    mapInput: MapInputMiddleware<UInput, UMappedInput>,
  ): DecoratedMiddleware<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInput & UInput,
    TOutput
  >
}

export function decorateMiddleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput,
>(
  middleware: Middleware<TContext, TExtraContext, TInput, TOutput>,
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

  return extended as DecoratedMiddleware<
    TContext,
    TExtraContext,
    TInput,
    TOutput
  >
}
